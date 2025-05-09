// socket.js
import { io } from "socket.io-client";

// Connect to the backend root (not /api) for Socket.IO
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://linkupsocial.onrender.com";

const socket = io(SOCKET_URL);

export default socket;
