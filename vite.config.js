import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Map non-VITE_* envs to VITE_* so they are exposed to the client bundle.
// WARNING: Anything exposed here will be public in the client JS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const VITE_OPENAI_API_KEY =
    env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || "";
  const VITE_ELEVENLABS_API_KEY =
    env.VITE_ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY || "";
  const VITE_OPENAI_MODEL = env.VITE_OPENAI_MODEL || "gpt-5-mini";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_OPENAI_API_KEY": JSON.stringify(VITE_OPENAI_API_KEY),
      "import.meta.env.VITE_ELEVENLABS_API_KEY": JSON.stringify(
        VITE_ELEVENLABS_API_KEY
      ),
      "import.meta.env.VITE_OPENAI_MODEL": JSON.stringify(VITE_OPENAI_MODEL),
    },
  };
});
