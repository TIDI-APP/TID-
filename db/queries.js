const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Busca a un usuario en la tabla por su Email
 */
const getUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * Registra un usuario de forma Manual desde el Formulario
 */
const createUserManual = async (email, passwordHash, firstName, lastName) => {
    const { data, error } = await supabase
        .from('users')
        .insert({ email, password_hash: passwordHash, first_name: firstName, last_name: lastName })
        .select('id, email, first_name, last_name')
        .single();
    if (error) throw error;
    return data;
};

/**
 * Busca a un usuario por Google ID (Para inicio de sesión con OAuth)
 */
const getUserByGoogleId = async (googleId) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * Crea o vincula una cuenta desde Google.
 * Si el usuario ya existe con ese correo pero no tiene el google_id conectado, lo actualiza.
 * Si no existe, lo inserta de cero.
 */
const createOrUpdateGoogleUser = async (email, googleId, firstName, lastName, avatarUrl) => {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
        const { data, error } = await supabase
            .from('users')
            .update({ google_id: googleId, avatar_url: avatarUrl })
            .eq('email', email)
            .select('id, email, first_name, last_name, google_id, avatar_url')
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('users')
            .insert({ email, google_id: googleId, first_name: firstName, last_name: lastName, avatar_url: avatarUrl })
            .select('id, email, first_name, last_name, google_id, avatar_url')
            .single();
        if (error) throw error;
        return data;
    }
};

const updateUserProfile = async (userId, firstName, lastName) => {
    const { data, error } = await supabase
        .from('users')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', userId)
        .select('id, email, first_name, last_name, google_id, avatar_url')
        .single();
    if (error) throw error;
    return data;
};

const getUserById = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, google_id, avatar_url')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * Cuenta transacciones creadas por IA (voz o cámara) del usuario
 */
const countAiTransactions = async (userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('id, data')
        .eq('user_id', userId);
    if (error) throw error;
    return (data || []).filter(t => t.data && (t.data.source === 'voice' || t.data.source === 'camera')).length;
};

/**
 * Guarda una transacción con data JSONB vinculada al usuario
 */
const createTransaction = async (userId, data) => {
    const { data: row, error } = await supabase
        .from('transactions')
        .insert({ user_id: userId, data })
        .select('id, user_id, data, created_at')
        .single();
    if (error) throw error;
    return row;
};

/**
 * Obtiene todas las transacciones de un usuario ordenadas por fecha
 */
const getTransactionsByUser = async (userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('id, data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

const deleteTransaction = async (txId, userId) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txId)
        .eq('user_id', userId);
    if (error) throw error;
};

module.exports = {
    getUserByEmail,
    getUserById,
    createUserManual,
    getUserByGoogleId,
    createOrUpdateGoogleUser,
    updateUserProfile,
    createTransaction,
    getTransactionsByUser,
    deleteTransaction,
    countAiTransactions
};
