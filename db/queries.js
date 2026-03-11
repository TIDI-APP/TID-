const { Pool } = require('pg');

// Crea el POOL de conexiones usando las variables de entorno
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/tidi' // Añade esto en tu .env real
});

/**
 * Busca a un usuario en la tabla por su Email
 */
const getUserByEmail = async (email) => {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
};

/**
 * Registra un usuario de forma Manual desde el Formulario
 */
const createUserManual = async (email, passwordHash, firstName, lastName) => {
    const query = `
        INSERT INTO users (email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, first_name, last_name;
    `;
    const res = await pool.query(query, [email, passwordHash, firstName, lastName]);
    return res.rows[0];
};

/**
 * Busca a un usuario por Google ID (Para inicio de sesión con OAuth)
 */
const getUserByGoogleId = async (googleId) => {
    const res = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return res.rows[0];
};

/**
 * Crea o vincula una cuenta desde Google.
 * Si el usuario ya existe con ese correo pero no tiene el google_id conectado, lo actualiza.
 * Si no existe, lo inserta de cero.
 */
const createOrUpdateGoogleUser = async (email, googleId, firstName, lastName) => {
    // Verificar si el correo ya existe
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
        // Actualiza agregando el Google ID
        const updateQuery = `
            UPDATE users SET google_id = $1 WHERE email = $2 RETURNING id, email, first_name, last_name, google_id;
        `;
        const res = await pool.query(updateQuery, [googleId, email]);
        return res.rows[0];
    } else {
        // Crearlo desde cero si no existe (al pasarlo como Google ya no se envía contraseña)
        const insertQuery = `
            INSERT INTO users (email, google_id, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, first_name, last_name, google_id;
        `;
        const res = await pool.query(insertQuery, [email, googleId, firstName, lastName]);
        return res.rows[0];
    }
};

module.exports = {
    getUserByEmail,
    createUserManual,
    getUserByGoogleId,
    createOrUpdateGoogleUser
};
