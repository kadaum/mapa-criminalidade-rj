declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CONTRIBUTION_IP_HASH_SECRET?: string;
    MODERATOR_USER_IDS?: string;
  }
}
