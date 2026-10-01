import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '@config/index';
import { PrismaService } from '@infra/database';
import type { Actor } from '@modules/access';
import { ConflictError, NotFoundError, UnauthorizedError } from '@shared/errors';
import { ActivityRecordService } from './activity-record.service';

interface StravaConnectionRow {
  userId: string;
  athleteId: string;
  athleteDisplayName: string | null;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  accessTokenExpiresAt: Date;
  scopes: string[];
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
    username?: string;
  };
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  distance?: number;
  description?: string | null;
}

interface StravaStatePayload {
  userId: string;
  expiresAt: number;
}

export interface StravaStatusView {
  configured: boolean;
  connected: boolean;
  athleteId: string | null;
  athleteDisplayName: string | null;
  scopes: string[];
  lastSyncedAt: Date | null;
}

export interface StravaSyncResult {
  imported: number;
  skipped: number;
  lastSyncedAt: Date;
}

@Injectable()
export class StravaIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: ActivityRecordService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private configured(): boolean {
    return Boolean(
      this.config.stravaClientId &&
      this.config.stravaClientSecret &&
      this.config.stravaRedirectUri &&
      this.config.integrationTokenEncryptionKey,
    );
  }

  private assertConfigured(): void {
    if (!this.configured()) {
      throw new ConflictError(
        'Strava is not configured on this Wayfinder environment yet.',
        [],
        'STRAVA_NOT_CONFIGURED',
      );
    }
  }

  private encryptionKey(): Buffer {
    this.assertConfigured();
    return Buffer.from(this.config.integrationTokenEncryptionKey!, 'hex');
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  private decrypt(value: string): string {
    const [ivPart, tagPart, encryptedPart] = value.split('.');
    if (!ivPart || !tagPart || !encryptedPart) {
      throw new Error('Invalid encrypted integration token.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private signState(userId: string): string {
    const payload: StravaStatePayload = {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.config.jwtSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyState(state: string): StravaStatePayload {
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) {
      throw new UnauthorizedError(
        'Invalid Strava authorization state.',
        [],
        'STRAVA_STATE_INVALID',
      );
    }
    const expected = createHmac('sha256', this.config.jwtSecret).update(encoded).digest();
    const received = Buffer.from(signature, 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedError(
        'Invalid Strava authorization state.',
        [],
        'STRAVA_STATE_INVALID',
      );
    }
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as StravaStatePayload;
    if (!parsed.userId || parsed.expiresAt < Date.now()) {
      throw new UnauthorizedError('Strava authorization has expired.', [], 'STRAVA_STATE_EXPIRED');
    }
    return parsed;
  }

  async status(actor: Actor): Promise<StravaStatusView> {
    if (!this.configured()) {
      return {
        configured: false,
        connected: false,
        athleteId: null,
        athleteDisplayName: null,
        scopes: [],
        lastSyncedAt: null,
      };
    }
    const connection = await this.findConnectionByUser(actor.id);
    return {
      configured: true,
      connected: Boolean(connection),
      athleteId: connection?.athleteId ?? null,
      athleteDisplayName: connection?.athleteDisplayName ?? null,
      scopes: connection?.scopes ?? [],
      lastSyncedAt: connection?.lastSyncedAt ?? null,
    };
  }

  authorizationUrl(actor: Actor): string {
    this.assertConfigured();
    const query = new URLSearchParams({
      client_id: this.config.stravaClientId!,
      redirect_uri: this.config.stravaRedirectUri!,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read',
      state: this.signState(actor.id),
    });
    return `https://www.strava.com/oauth/authorize?${query.toString()}`;
  }

  async completeAuthorization(input: {
    state: string;
    code: string;
    grantedScope?: string | null;
  }): Promise<string> {
    this.assertConfigured();
    const state = this.verifyState(input.state);
    const token = await this.exchangeCode(input.code);
    const athlete = token.athlete;
    if (!athlete?.id) {
      throw new ConflictError(
        'Strava did not return an athlete identity.',
        [],
        'STRAVA_ATHLETE_MISSING',
      );
    }
    const displayName =
      [athlete.firstname, athlete.lastname].filter(Boolean).join(' ').trim() ||
      athlete.username ||
      null;
    const scopes = (input.grantedScope ?? token.scope ?? '')
      .split(/[ ,]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);

    await this.prisma.$executeRaw`
      INSERT INTO "strava_connection" (
        "userId", "athleteId", "athleteDisplayName", "accessTokenCiphertext",
        "refreshTokenCiphertext", "accessTokenExpiresAt", "scopes"
      ) VALUES (
        ${state.userId}, ${String(athlete.id)}, ${displayName}, ${this.encrypt(token.access_token)},
        ${this.encrypt(token.refresh_token)}, ${new Date(token.expires_at * 1000)}, ${scopes}
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "athleteId" = EXCLUDED."athleteId",
        "athleteDisplayName" = EXCLUDED."athleteDisplayName",
        "accessTokenCiphertext" = EXCLUDED."accessTokenCiphertext",
        "refreshTokenCiphertext" = EXCLUDED."refreshTokenCiphertext",
        "accessTokenExpiresAt" = EXCLUDED."accessTokenExpiresAt",
        "scopes" = EXCLUDED."scopes",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    return this.config.wayfinderMobileRedirectUri;
  }

  async sync(actor: Actor): Promise<StravaSyncResult> {
    this.assertConfigured();
    const connection = await this.requireConnection(actor.id);
    return this.syncConnection(actor.id, connection);
  }

  async disconnect(actor: Actor): Promise<void> {
    this.assertConfigured();
    const connection = await this.requireConnection(actor.id);
    const token = await this.validAccessToken(connection);
    const basic = Buffer.from(
      `${this.config.stravaClientId!}:${this.config.stravaClientSecret!}`,
    ).toString('base64');
    try {
      await fetch('https://www.strava.com/oauth/revoke', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token, token_type_hint: 'access_token' }),
      });
    } finally {
      await this.prisma.$executeRaw`DELETE FROM "strava_connection" WHERE "userId" = ${actor.id}`;
    }
  }

  verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string {
    if (
      mode !== 'subscribe' ||
      !token ||
      !challenge ||
      !this.config.stravaWebhookVerifyToken ||
      token !== this.config.stravaWebhookVerifyToken
    ) {
      throw new UnauthorizedError(
        'Strava webhook verification failed.',
        [],
        'STRAVA_WEBHOOK_INVALID',
      );
    }
    return challenge;
  }

  async handleWebhook(event: {
    object_type?: string;
    aspect_type?: string;
    object_id?: number;
    owner_id?: number;
  }): Promise<void> {
    const objectId = event.object_id;
    const ownerId = event.owner_id;
    if (
      !this.configured() ||
      event.object_type !== 'activity' ||
      typeof objectId !== 'number' ||
      !Number.isSafeInteger(objectId) ||
      objectId <= 0 ||
      typeof ownerId !== 'number' ||
      !Number.isSafeInteger(ownerId) ||
      ownerId <= 0
    )
      return;

    const connection = await this.findConnectionByAthlete(String(ownerId));
    if (!connection) return;

    if (event.aspect_type === 'delete') {
      await this.records.deleteExternal(connection.userId, 'strava', String(objectId));
      return;
    }
    if (event.aspect_type !== 'create' && event.aspect_type !== 'update') return;

    // Webhook data never becomes an outbound request URL. It only triggers an
    // authenticated refresh against Strava's fixed athlete activities endpoint.
    await this.syncConnection(connection.userId, connection);
  }

  private async syncConnection(
    userId: string,
    connection: StravaConnectionRow,
  ): Promise<StravaSyncResult> {
    const accessToken = await this.validAccessToken(connection);
    const after = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    const activitiesUrl = new URL('https://www.strava.com/api/v3/athlete/activities');
    activitiesUrl.searchParams.set('after', String(after));
    activitiesUrl.searchParams.set('per_page', '100');
    const response = await fetch(activitiesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new ConflictError(
        'Wayfinder could not read your Strava activities right now.',
        [{ status: response.status }],
        'STRAVA_SYNC_FAILED',
      );
    }

    const activities = (await response.json()) as StravaActivity[];
    const hobbyId = await this.runningHobbyId();
    let imported = 0;
    let skipped = 0;
    for (const activity of activities) {
      if (!this.isRunningActivity(activity.sport_type)) {
        skipped += 1;
        continue;
      }
      await this.records.upsertExternal({
        userId,
        hobbyId,
        sportType: activity.sport_type,
        title: activity.name,
        startedAt: new Date(activity.start_date),
        durationSeconds: activity.elapsed_time,
        distanceMeters: activity.distance ?? null,
        notes: activity.description ?? null,
        source: 'strava',
        sourceReferenceId: String(activity.id),
        externalUrl: `https://www.strava.com/activities/${activity.id}`,
      });
      imported += 1;
    }

    const lastSyncedAt = new Date();
    await this.prisma.$executeRaw`
      UPDATE "strava_connection"
      SET "lastSyncedAt" = ${lastSyncedAt}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}
    `;
    return { imported, skipped, lastSyncedAt };
  }

  private async exchangeCode(code: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.stravaClientId!,
        client_secret: this.config.stravaClientSecret!,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!response.ok) {
      throw new ConflictError(
        'Strava authorization could not be completed.',
        [],
        'STRAVA_AUTH_FAILED',
      );
    }
    return (await response.json()) as StravaTokenResponse;
  }

  private async validAccessToken(connection: StravaConnectionRow): Promise<string> {
    if (connection.accessTokenExpiresAt.getTime() > Date.now() + 60 * 60 * 1000) {
      return this.decrypt(connection.accessTokenCiphertext);
    }
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.stravaClientId!,
        client_secret: this.config.stravaClientSecret!,
        grant_type: 'refresh_token',
        refresh_token: this.decrypt(connection.refreshTokenCiphertext),
      }),
    });
    if (!response.ok) {
      throw new ConflictError(
        'Your Strava connection needs to be reconnected.',
        [],
        'STRAVA_RECONNECT_REQUIRED',
      );
    }
    const token = (await response.json()) as StravaTokenResponse;
    await this.prisma.$executeRaw`
      UPDATE "strava_connection"
      SET "accessTokenCiphertext" = ${this.encrypt(token.access_token)},
          "refreshTokenCiphertext" = ${this.encrypt(token.refresh_token)},
          "accessTokenExpiresAt" = ${new Date(token.expires_at * 1000)},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${connection.userId}
    `;
    return token.access_token;
  }

  private async findConnectionByUser(userId: string): Promise<StravaConnectionRow | null> {
    const rows = await this.prisma.$queryRaw<StravaConnectionRow[]>`
      SELECT "userId", "athleteId", "athleteDisplayName", "accessTokenCiphertext",
             "refreshTokenCiphertext", "accessTokenExpiresAt", "scopes", "lastSyncedAt",
             "createdAt", "updatedAt"
      FROM "strava_connection" WHERE "userId" = ${userId} LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async findConnectionByAthlete(athleteId: string): Promise<StravaConnectionRow | null> {
    const rows = await this.prisma.$queryRaw<StravaConnectionRow[]>`
      SELECT "userId", "athleteId", "athleteDisplayName", "accessTokenCiphertext",
             "refreshTokenCiphertext", "accessTokenExpiresAt", "scopes", "lastSyncedAt",
             "createdAt", "updatedAt"
      FROM "strava_connection" WHERE "athleteId" = ${athleteId} LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async requireConnection(userId: string): Promise<StravaConnectionRow> {
    const connection = await this.findConnectionByUser(userId);
    if (!connection) {
      throw new NotFoundError('Connect Strava first.', [], 'STRAVA_NOT_CONNECTED');
    }
    return connection;
  }

  private async runningHobbyId(): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "catalog_hobby" WHERE "slug" = 'running' AND "status" = 'active' LIMIT 1
    `;
    const row = rows[0];
    if (!row)
      throw new NotFoundError('Running hobby is not available.', [], 'RUNNING_HOBBY_NOT_FOUND');
    return row.id;
  }

  private isRunningActivity(sportType: string): boolean {
    return ['Run', 'TrailRun', 'VirtualRun'].includes(sportType);
  }
}
