INSERT INTO admins(email, password_hash) VALUES
('admin@mail.hei.school', '$2b$10$y1.2tMYSaWok5L7vCwK81e.IBOGaiXnz/ZEvQJ53J7NpJ60tROnIW')
ON CONFLICT (email) DO NOTHING;
