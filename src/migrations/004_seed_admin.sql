INSERT INTO admins(email, password_hash) VALUES
('admin@mail.hei.school', '$2b$10$E3x/3K7qgZHjzv6KMMZMWeSj/Dytgc2aTVx2mTXbqXDUCRwsAvpji')
ON CONFLICT (email) DO NOTHING;
