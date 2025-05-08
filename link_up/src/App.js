import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./Components/Sidebar/Layout";
import HomePage from "./HomePage";
import Login from "./Components/LoginSignup/Login";
import Signup from "./Components/LoginSignup/Signup";
import Feed from "./Components/Feed/Feed";
import Profile from "./Components/Profile/Profile";
import CustomizeProfile from "./Components/Profile/EditProfile";
import Messages from "./Components/Messages/Messages";
import Friends from "./Components/Friends/Friends";
import Explore from "./Components/Explore/Explore";
import Notifications from "./Components/Notification1/Notifications";
import { UserProvider } from "./contextProvider";
import socket from "../../socket";

function LinkUp() {
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (currentUser?.id) {
      socket.emit("join", currentUser.id);

      socket.on("notification", (data) => {
        console.log("🔔 Notification received:", data);

        // 🔔 You can replace this with a toast or badge update logic
        alert(`${data.fromUsername} ${data.message}`);
      });
    }

    return () => {
      socket.off("notification");
    };
  }, []);

  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Pages WITHOUT Sidebar */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/customize-profile/:username" element={<CustomizeProfile />} />
          <Route path="/customize-profile" element={<CustomizeProfile />} />

          {/* Pages WITH Sidebar */}
          <Route path="/feed" element={<Layout><Feed /></Layout>} />
          <Route path="/messages" element={<Layout><Messages /></Layout>} />
          <Route path="/friends" element={<Layout><Friends /></Layout>} />
          <Route path="/explore" element={<Layout><Explore /></Layout>} />
          <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
          <Route path="/profile/:username" element={<Layout><Profile /></Layout>} />

        </Routes>
      </Router>
    </UserProvider>
  );
}

export default LinkUp;