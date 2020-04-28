import { SEA } from 'api/gun-peer';

export async function hash(data) {
    const hash = await SEA.work(data, null, null, { name: 'SHA-256' });
    return encodeURIComponent(hash);
}
