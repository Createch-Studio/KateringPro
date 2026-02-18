import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error('NEXT_PUBLIC_POCKETBASE_URL environment variable is not set');
}

let pb: PocketBase | null = null;

export const getPocketBase = (): PocketBase => {
  if (!pb) {
    pb = new PocketBase(POCKETBASE_URL);
  }
  return pb;
};

export const isPocketBaseInitialized = (): boolean => {
  return pb !== null;
};

export default getPocketBase;
