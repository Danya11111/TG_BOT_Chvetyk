import type { Plugin } from 'vite';

type ViteDevServerWithCheckOrigin = {
  // Vite internal method, may be missing from typings depending on version
  checkOrigin?: (origin: string, host: string) => boolean;
  httpServer?: {
    on: (event: 'request', listener: (req: unknown, res: unknown) => void) => void;
  } | null;
};

type RequestWithSkipHostCheck = {
  __vite_skip_host_check?: boolean;
};

/**
 * Dev helper: disable Vite host/origin checks for ngrok tunnels.
 */
export function viteNgrokPlugin(): Plugin {
  return {
    name: 'vite-ngrok-plugin',
    configureServer(server: unknown) {
      const serverWithCheck = server as ViteDevServerWithCheckOrigin;

      // Disable strict origin/host validation (ngrok changes host dynamically)
      serverWithCheck.checkOrigin = () => true;

      const httpServer = serverWithCheck.httpServer;
      if (!httpServer) {
        return;
      }

      httpServer.on('request', (req: unknown) => {
        (req as RequestWithSkipHostCheck).__vite_skip_host_check = true;
      });
    },
  };
}
