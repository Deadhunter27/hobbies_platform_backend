import type { ActivityView } from '@modules/activity';
import type { HobbyContext } from '@modules/profile';
import type { RecommendationRejectionReason } from './recommendation.entity';

export interface RankedActivity {
  view: ActivityView;
  score: number;
  fitSignals: string[];
  rationale: string;
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function scoreCandidate(
  context: HobbyContext,
  candidate: ActivityView,
  rejectionReason?: RecommendationRejectionReason,
): RankedActivity {
  const activity = candidate.activity;
  let score = 0;
  const signals: string[] = [];

  if (candidate.availability !== 'available') {
    return {
      view: candidate,
      score: Number.NEGATIVE_INFINITY,
      fitSignals: [],
      rationale: 'This activity is not currently available.',
    };
  }

  if (activity.effortLevel === 'easy' || activity.effortLevel === 'open') {
    if (context.primaryIntent === 'start' || context.primaryIntent === 'explore') {
      score += 5;
      signals.push('Lower-pressure effort matches your current intent.');
    }
    if (context.experienceLevel === 'beginner' || context.experienceLevel === 'returning') {
      score += 4;
      signals.push('The effort level fits a beginner or returning context.');
    }
  }

  if (context.primaryIntent === 'improve') {
    if (activity.effortLevel === 'moderate') {
      score += 6;
      signals.push('A moderate, structured effort supports improvement without defaulting to all-out pace.');
    }
    if (includesAny(activity.activityType, ['pace', 'interval', 'technique', 'structured'])) {
      score += 4;
      signals.push('The activity has a structured improvement focus.');
    }
  }

  const hasSocialContext = Boolean(activity.communityReferenceId || activity.hostName);
  if (context.primaryIntent === 'social' || context.socialPreference === 'social') {
    if (hasSocialContext) {
      score += 7;
      signals.push('Host or community context makes the social side visible before you commit.');
    } else {
      score -= 4;
    }
  }

  if (context.socialPreference === 'solo' && activity.communityReferenceId) {
    score -= 5;
  }

  if (context.primaryIntent === 'explore') {
    score += 2;
    signals.push('This gives you something concrete to try without requiring a long-term plan.');
  }

  if (context.experienceLevel === 'experienced' && activity.effortLevel === 'easy') {
    score -= 1;
  }

  if (rejectionReason === 'too_difficult') {
    if (activity.effortLevel === 'easy' || activity.effortLevel === 'open') {
      score += 8;
      signals.push('You asked for something easier, so this lowers the effort barrier.');
    } else {
      score -= 8;
    }
  }

  if (rejectionReason === 'prefer_solo' || rejectionReason === 'social_comfort') {
    if (!activity.communityReferenceId) {
      score += 8;
      signals.push('You asked for less social pressure, so this does not depend on joining a community.');
    } else {
      score -= 8;
    }
  }

  if (rejectionReason === 'learn_first') {
    if (includesAny(`${activity.activityType} ${activity.preparation} ${activity.expectations}`, ['learn', 'intro', 'guided', 'technique', 'walk'])) {
      score += 6;
      signals.push('This option gives you a more guided or learning-friendly way in.');
    }
  }

  if (rejectionReason === 'timing') {
    score += 1;
    signals.push('This is a different available opportunity from the one you rejected.');
  }

  if (signals.length === 0) {
    signals.push('This is currently available and matches your hobby context.');
  }

  const rationale = signals.slice(0, 2).join(' ');
  return { view: candidate, score, fitSignals: signals, rationale };
}

export function rankActivities(
  context: HobbyContext,
  candidates: ActivityView[],
  options?: { rejectionReason?: RecommendationRejectionReason; excludeActivityIds?: string[] },
): RankedActivity[] {
  const excluded = new Set(options?.excludeActivityIds ?? []);

  return candidates
    .filter((candidate) => !excluded.has(candidate.activity.id))
    .map((candidate) => scoreCandidate(context, candidate, options?.rejectionReason))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeDifference = a.view.activity.startsAt.getTime() - b.view.activity.startsAt.getTime();
      if (timeDifference !== 0) return timeDifference;
      return a.view.activity.id.localeCompare(b.view.activity.id);
    });
}
