
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');            

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      let user;
      if (result.rows.length === 0) {
        const insert = await pool.query(
          `INSERT INTO users (email, provider, role)
           VALUES ($1, 'google', 'user') RETURNING *`,
          [email]
        );
        user = insert.rows[0];
      } else {
        user = result.rows[0];
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));
