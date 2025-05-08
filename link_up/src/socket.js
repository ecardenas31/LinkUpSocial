// socket.js
import { io } from "socket.io-client";

// Use Vercel env var if defined, otherwise fall back to your Render backend
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://linkup-backend.onrender.com";

const socket = io(SOCKET_URL);

export default socket;