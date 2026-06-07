import { io } from 'socket.io-client';
import { getUser } from '#/lib/auth';

export const socket = io(import.meta.env.VITE_API_BASE_URL, {
  path: '/socket.io',
  autoConnect: false,
  transports: ['websocket', 'polling'],
  auth: async (cb: (data: Record<string, string>) => void) => {
    const user = await getUser();
    cb(user?.access_token ? { token: user.access_token } : {});
  },
});
