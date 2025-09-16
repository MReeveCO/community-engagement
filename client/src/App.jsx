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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static">
        <Toolbar>
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
            sx={{ cursor: "default", flexGrow: 1 }}
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
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {!showUserDetails && (
          <Paper elevation={1} sx={{ mb: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v);
                if (v === 1) setAreaRefresh((c) => c + 1);
              }}
              variant="fullWidth"
            >
              <Tab label="Your Answers" />
              <Tab label="Your Area" />
            </Tabs>
          </Paper>
        )}

        {showUserDetails && <UserDetails />}

        {!showUserDetails && tab === 0 && <SwipeQuiz adminMode={adminMode} />}

        {!showUserDetails && tab === 1 && <YourArea refreshKey={areaRefresh} />}
      </Container>
    </Box>
  );
}
