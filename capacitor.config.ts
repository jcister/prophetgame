import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.prophetgame.app",
  appName: "Prophet Order Challenge",
  webDir: "out",
  server: {
    androidScheme: "https"
  }
};

export default config;
