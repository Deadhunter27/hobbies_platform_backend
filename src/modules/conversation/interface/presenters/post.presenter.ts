import type { PostView, ReplyView } from '../../application';
import type { PostResponseDto, ReplyResponseDto } from '../dto/post.dto';

export function toPostResponse(view: PostView): PostResponseDto {
  return { ...view, createdAt: view.createdAt.toISOString() };
}

export function toReplyResponse(view: ReplyView): ReplyResponseDto {
  return { ...view, createdAt: view.createdAt.toISOString() };
}
