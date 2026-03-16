const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key (bypasses row-level security)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Finds a user by their email address; returns null if not found (PGRST116 = not found, not an error)
const getUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

// Creates a new user from the manual registration form (email + hashed password)
const createUserManual = async (email, passwordHash, firstName, lastName) => {
    const { data, error } = await supabase
        .from('users')
        .insert({ email, password_hash: passwordHash, first_name: firstName, last_name: lastName })
        .select('id, email, first_name, last_name, is_premium')
        .single();
    if (error) throw error;
    return data;
};

// Finds a user by their Google OAuth ID; returns null if not found
const getUserByGoogleId = async (googleId) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

// Creates or links a Google account:
// - If the email already exists, updates the google_id and avatar_url on the existing account
// - If the email doesn't exist, inserts a brand-new user record
const createOrUpdateGoogleUser = async (email, googleId, firstName, lastName, avatarUrl) => {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
        // Link Google account to an existing email-based account
        const { data, error } = await supabase
            .from('users')
            .update({ google_id: googleId, avatar_url: avatarUrl })
            .eq('email', email)
            .select('id, email, first_name, last_name, google_id, avatar_url, is_premium')
            .single();
        if (error) throw error;
        return data;
    } else {
        // Create a new user from Google sign-in
        const { data, error } = await supabase
            .from('users')
            .insert({ email, google_id: googleId, first_name: firstName, last_name: lastName, avatar_url: avatarUrl })
            .select('id, email, first_name, last_name, google_id, avatar_url, is_premium')
            .single();
        if (error) throw error;
        return data;
    }
};

// Updates the first and last name of a user by their ID
const updateUserProfile = async (userId, firstName, lastName) => {
    const { data, error } = await supabase
        .from('users')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', userId)
        .select('id, email, first_name, last_name, google_id, avatar_url, is_premium')
        .single();
    if (error) throw error;
    return data;
};

// Returns a user's public profile fields by their ID
const getUserById = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, google_id, avatar_url, is_premium')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

// Counts how many AI-generated transactions (voice or camera) the user has created — used for the free tier limit
const countAiTransactions = async (userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('id, data')
        .eq('user_id', userId);
    if (error) throw error;
    return (data || []).filter(t => t.data && (t.data.source === 'voice' || t.data.source === 'camera')).length;
};

// Inserts a new transaction as a JSONB data object linked to the user
const createTransaction = async (userId, data) => {
    const { data: row, error } = await supabase
        .from('transactions')
        .insert({ user_id: userId, data })
        .select('id, user_id, data, created_at')
        .single();
    if (error) throw error;
    return row;
};

// Returns all transactions for a user ordered by creation date descending
const getTransactionsByUser = async (userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('id, data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

// Deletes a transaction by ID, scoped to the user (prevents deleting other users' data)
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
