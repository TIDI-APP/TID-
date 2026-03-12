const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../../db/queries');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            const email = profile.emails[0].value;
            const firstName = profile.name.givenName || '';
            const lastName = profile.name.familyName || '';
            const googleId = profile.id;
            const avatarUrl = (profile.photos && profile.photos[0]) ? profile.photos[0].value : null;

            const user = await db.createOrUpdateGoogleUser(email, googleId, firstName, lastName, avatarUrl);
            return cb(null, user);
        } catch (error) {
            return cb(error, null);
        }
    }
));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

module.exports = passport;
