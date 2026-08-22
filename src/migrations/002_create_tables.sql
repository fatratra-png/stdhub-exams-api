CREATE TABLE IF NOT EXISTS admins(
      id VARCHAR(20) PRIMARY KEY,
      email VARCHAR(30) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students(
      id VARCHAR(20) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      email VARCHAR(30) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS student_id_counter(
      id INT PRIMARY KEY DEFAULT 1,
      counter INT NOT NULL DEFAULT 0
);

INSERT INTO student_id_counter(id,counter) VALUES (1,0) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ues(
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams(
      id SERIAL PRIMARY KEY,
      ue_id INT NOT NULL REFERENCES ues(id) ON DELETE RESTRICT,
      title VARCHAR(100) NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions(
      id SERIAL PRIMARY KEY,
      exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      statement TEXT NOT NULL,
      points INT NOT NULL CHECK (points>0),
      position INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS choices(
      id SERIAL PRIMARY KEY,
      question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS attempts(
      id SERIAL PRIMARY KEY,
      student_id VARCHAR(20) NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMP,
      score INT,
      UNIQUE (student_id,exam_id)
);

CREATE TABLE IF NOT EXISTS answers(
      id SERIAL PRIMARY KEY,
      attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id INT NOT NULL REFERENCES questions(id),
      choice_id INT REFERENCES choices(id),
      UNIQUE (attempt_id,question_id)
);

CREATE INDEX IF NOT EXISTS idx_exams_ue ON exams(ue_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_choices_question ON choices(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam ON attempts(exam_id);