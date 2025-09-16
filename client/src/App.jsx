import React, { useState } from "react";
import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Paper,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SwipeQuiz from "./components/SwipeQuiz";
import UserDetails from "./components/UserDetails";
import YourArea from "./components/YourArea";

export default function App() {
  const [tab, setTab] = useState(0);
  const [areaRefresh, setAreaRefresh] = useState(0);
  const [adminClicks, setAdminClicks] = useState(0);
  const [adminMode, setAdminMode] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  return (
    <Box sx={{ height: "100%", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <AppBar position="static">
        <Toolbar sx={{ flexDirection: "column", alignItems: "stretch", py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography
              variant="h6"
              component="div"
              onClick={() => {
                setAdminClicks((c) => {
                  const next = c + 1;
                  if (next >= 7) {
                    setAdminMode(true);
                  }
                  return next;
                });
                setShowUserDetails(false);
              }}
              sx={{ cursor: "pointer", flexGrow: 1 }}
            >
              Have Your Say
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => setShowUserDetails(true)}
              sx={{ mr: 1 }}
            >
              <PersonIcon />
            </IconButton>
            {adminMode && (
              <Typography
                sx={{ ml: 2 }}
                variant="caption"
                onClick={() => setAdminMode((v) => !v)}
              >
                Admin mode
              </Typography>
            )}
          </Box>
          {!showUserDetails && (
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v);
                if (v === 1) setAreaRefresh((c) => c + 1);
              }}
              variant="fullWidth"
              sx={{ 
                "& .MuiTab-root": { 
                  color: "rgba(255, 255, 255, 0.7)",
                  minHeight: 32,
                  padding: "6px 12px"
                },
                "& .Mui-selected": {
                  color: "white"
                }
              }}
            >
              <Tab label="Your Answers" />
              <Tab label="Your Area" />
            </Tabs>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 2, px: 2, flex: 1, overflow: "auto" }}>
        {showUserDetails && <UserDetails />}

        {!showUserDetails && tab === 0 && <SwipeQuiz adminMode={adminMode} />}

        {!showUserDetails && tab === 1 && <YourArea refreshKey={areaRefresh} />}
      </Container>
    </Box>
  );
}
