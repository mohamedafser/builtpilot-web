import { buildSocialShareImage, size, alt, contentType } from "@/lib/social-share-image";

export { alt, size, contentType };

export default function TwitterImage() {
  return buildSocialShareImage();
}
