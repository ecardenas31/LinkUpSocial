import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contextProvider";
import "bootstrap/dist/css/bootstrap.min.css";
import { fetchAPI } from "../../fetchAPI";
import API from "../../api"; // Base API URL

const CustomizeProfile = () => {
  const { user } = useContext(UserContext);
  const [originalAboutMe, setOriginalAboutMe] = useState("");

  const navigate = useNavigate();
  const [customImageFile, setCustomImageFile] = useState(null);
  const [htmlInput, setHtmlInput] = useState("");
  const [bgUrl, setBgUrl] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [cardColor, setCardColor] = useState("");
  const [originalCardColor, setOriginalCardColor] = useState("");
  const [themeSongUrl, setThemeSongUrl] = useState("");
  const [themeSongTitle, setThemeSongTitle] = useState("");
  const [bioInput, setBioInput] = useState(user?.bio || "");
  const [linksInput, setLinksInput] = useState(user?.links ? JSON.parse(user.links) : [""]);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [stagedProfilePic, setStagedProfilePic] = useState(null);
  const [stagedCoverPhoto, setStagedCoverPhoto] = useState(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");

  useEffect(() => {
    if (user && user.Username) {
      fetchAPI(`${API}/users/${user.id}`)
        .then(fresh => {
          setCardColor(fresh.background_color || "#ffffff");
          setOriginalCardColor(fresh.background_color || "#ffffff");
          setHtmlInput(fresh.AboutMe || "");
          setOriginalAboutMe(fresh.AboutMe || "");
          setProfilePicUrl(fresh.profilePicUrl || "");
          setCoverPhotoUrl(fresh.coverPhotoUrl || "");
          setBgUrl(fresh.backgroundImageUrl || "");
          setThemeSongUrl(fresh.themeSongUrl || "");
          setThemeSongTitle(fresh.themeSongTitle || "");
          setBioInput(fresh.bio || "");

          const minimalUserData = {
            id: fresh.id,
            Username: fresh.Username,
            AboutMe: fresh.AboutMe,
            background_color: fresh.background_color,
            bio: fresh.bio,
            profilePicUrl: fresh.profilePicUrl,
            coverPhotoUrl: fresh.coverPhotoUrl,
            backgroundImageUrl: fresh.backgroundImageUrl,
          };
          localStorage.setItem("currentUser", JSON.stringify(minimalUserData));
        })
        .catch(err => {
          console.error("Failed to fetch user:", err);
        });
    }
  }, [user]);

  const handleBackgroundChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const formData = new FormData();
    formData.append("background", file);
    formData.append("userId", user.id);

    try {
      setUploadingBg(true);
      const data = await fetchAPI(`${API}/users/upload-background`, {
        method: "POST",
        body: formData,
      });

      if (data.url) {
        setBgUrl(data.url);
        localStorage.setItem("currentUser", JSON.stringify({ ...user, backgroundImageUrl: data.url }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setStagedProfilePic(file);
    setProfilePicUrl(URL.createObjectURL(file));
  };

  const handleCoverPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setStagedCoverPhoto(file);
    setCoverPhotoUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    try {
      const trimmedAboutMe = htmlInput.trim();
      const trimmedColor = cardColor.trim();
      const trimmedLinks = linksInput.filter(link => link.trim() !== "");

      const updatedFields = {
        AboutMe: trimmedAboutMe,
        background_color: trimmedColor,
        bio: bioInput.trim(),
        themeSongUrl: themeSongUrl.trim(),
        links: JSON.stringify(trimmedLinks),
      };

      if (stagedProfilePic) {
        const formData = new FormData();
        formData.append("profilePic", stagedProfilePic);
        formData.append("userId", user.id);
        const res = await fetchAPI(`${API}/users/upload-profile-pic`, {
          method: "POST",
          body: formData,
        });
        if (res?.url) setProfilePicUrl(res.url);
      }

      if (stagedCoverPhoto) {
        const formData = new FormData();
        formData.append("coverPhoto", stagedCoverPhoto);
        formData.append("userId", user.id);

        const res = await fetchAPI(`${API}/users/upload-cover-photo`, {
          method: "POST",
          body: formData,
        });

        if (res?.url) setCoverPhotoUrl(res.url);
        else throw new Error("Failed to upload cover photo.");
      }

      if (customImageFile) {
        const formData = new FormData();
        formData.append("customImage", customImageFile);
        formData.append("userId", user.id);
        await fetchAPI(`${API}/users/upload-custom-image`, {
          method: "POST",
          body: formData,
        });
      }

      if (Object.keys(updatedFields).length > 0) {
        await fetchAPI(`${API}/users/update-profile/${user.id}`, {
          method: "PUT",
          body: JSON.stringify(updatedFields),
        });
      }

      const updatedUser = {
        ...user,
        AboutMe: trimmedAboutMe,
        background_color: trimmedColor,
        bio: bioInput.trim(),
        profilePicUrl,
        coverPhotoUrl,
        backgroundImageUrl: bgUrl,
        links: JSON.stringify(trimmedLinks),
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      navigate(`/profile/${user.Username}`);
      window.location.reload();
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile.");
    }
  };

  if (!user || !user.Username) {
    return <div className="text-center mt-5 text-muted">Loading...</div>;
  }

  return (
    <div className="container mt-5 p-4">
      {/* Your profile customization UI goes here */}
      {/* Display and upload logic for profilePicUrl, coverPhotoUrl, bgUrl, etc. */}
    </div>
  );
};

export default CustomizeProfile;