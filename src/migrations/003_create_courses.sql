INSERT INTO courses(code,name) VALUES
('WEB1','Interfaces web'),
('WEB2','Applications web globalement connectees'),
('PROG1','Algorithmiques'),
('PROG2','Implementation d''API Backend - Programmation orientee objet'),
('SYS1','Systemes d''exploitations'),
('SYS2','Systemes interconnectes'),
('THEORIE1','Mathematiques appliques a l''informatique'),
('DONNEES1','Base de donnees structures'),
('MGT1','Travail collaboratif'),
('LV1','Francais-Methodologie universitaire')
ON CONFLICT (code) DO NOTHING;