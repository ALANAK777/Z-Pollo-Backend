import { google } from 'googleapis';
import userModel from '../models/userModel.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const getOAuth2Client = (accessToken, refreshToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/user/auth/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

const refreshAccessToken = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user || !user.googleRefreshToken) {
    throw new Error('No refresh token available');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/user/auth/google/callback`
  );

  oauth2Client.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  user.googleAccessToken = credentials.access_token;
  if (credentials.refresh_token) {
    user.googleRefreshToken = credentials.refresh_token;
  }
  await user.save();

  return credentials.access_token;
};

const createCalendarEvent = async (userId, eventDetails) => {
  try {
    const user = await userModel.findById(userId);
    if (!user || !user.googleAccessToken) {
      console.log('User not logged in with Google or no access token');
      return null;
    }

    let accessToken = user.googleAccessToken;
    let oauth2Client = getOAuth2Client(accessToken, user.googleRefreshToken);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      return response.data.id;
    } catch (error) {
      if (error.code === 401) {
        // Token expired, try refreshing
        accessToken = await refreshAccessToken(userId);
        oauth2Client = getOAuth2Client(accessToken, user.googleRefreshToken);
        const calendarRefreshed = google.calendar({ version: 'v3', auth: oauth2Client });
        const response = await calendarRefreshed.events.insert({
          calendarId: 'primary',
          resource: event,
        });
        return response.data.id;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

const updateCalendarEvent = async (userId, eventId, eventDetails) => {
  try {
    const user = await userModel.findById(userId);
    if (!user || !user.googleAccessToken) {
      console.log('User not logged in with Google or no access token');
      return false;
    }

    let accessToken = user.googleAccessToken;
    let oauth2Client = getOAuth2Client(accessToken, user.googleRefreshToken);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: 'UTC',
      },
    };

    try {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });
      return true;
    } catch (error) {
      if (error.code === 401) {
        accessToken = await refreshAccessToken(userId);
        oauth2Client = getOAuth2Client(accessToken, user.googleRefreshToken);
        const calendarRefreshed = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendarRefreshed.events.update({
          calendarId: 'primary',
          eventId: eventId,
          resource: event,
        });
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
};

const deleteCalendarEvent = async (userId, eventId) => {
  try {
    const user = await userModel.findById(userId);
    if (!user || !user.googleAccessToken) {
      console.log('User not logged in with Google or no access token');
      return false;
    }

    let accessToken = user.googleAccessToken;
    let oauth2Client = getOAuth2Client(accessToken, user.googleRefreshToken);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      return true;
    } catch (error) {
      if (error.code === 401) {
        accessToken = await refreshAccessToken(userId);
        oauth2Client = getOAuth2Client(accessToken, user.googleRefreshToken);
        const calendarRefreshed = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendarRefreshed.events.delete({
          calendarId: 'primary',
          eventId: eventId,
        });
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

export { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent };
