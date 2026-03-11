-- schema.sql
-- DDL para PostgreSQL: Tabla de Usuarios (Autenticación y Perfil Básico)
-- Nota: Actividades, Chatbot, y Transacciones se manejarán mediante NoSQL.

-- Si no tienes la extensión pgcrypto habilitada (opcional para UUIDs previos a PG13), descomenta esto:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    -- ID principal usando formato UUID para mayor seguridad
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Correo electrónico único
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Hash de contraseña (será NULL si el usuario solo se registra con Google)
    password_hash VARCHAR(255),
    
    -- ID de Google para inicio de sesión por OAuth
    google_id VARCHAR(255) UNIQUE,
    
    -- Información básica del perfil
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Control de fechas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para acelerar las búsquedas y login (correo o por google)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Función y disparador (Trigger) para actualizar automáticamente la fecha de 'updated_at' cada vez que el usuario modifica sus datos
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Previene crear el trigger múltiples veces si se ejecuta de nuevo el script
DROP TRIGGER IF EXISTS update_users_modtime ON users;

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
