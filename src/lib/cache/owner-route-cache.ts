import { revalidateTag, unstable_cache } from "next/cache";

const OWNER_ROUTE_CACHE_TTL_SECONDS = 15;

export function ownerRouteCacheTag(ownerId: string): string {
  return `owner-route:${ownerId}`;
}

export async function invalidateOwnerRouteCache(ownerId: string): Promise<void> {
  revalidateTag(ownerRouteCacheTag(ownerId), "max");
}

type CacheOwnerRouteOptions<T> = {
  namespace: string;
  ownerId: string;
  cacheKeyParts?: string[];
  revalidateSeconds?: number;
  load: () => Promise<T>;
};

export async function cacheOwnerRoute<T>({
  namespace,
  ownerId,
  cacheKeyParts = [],
  revalidateSeconds = OWNER_ROUTE_CACHE_TTL_SECONDS,
  load,
}: CacheOwnerRouteOptions<T>): Promise<T> {
  return unstable_cache(load, [namespace, ownerId, ...cacheKeyParts], {
    revalidate: revalidateSeconds,
    tags: [ownerRouteCacheTag(ownerId)],
  })();
}
