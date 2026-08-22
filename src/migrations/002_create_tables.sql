CREATE SEQUENCE IF NOT EXISTS admin_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS admins(
      id VARCHAR(20) PRIMARY KEY DEFAULT 'ADM' || LPAD(nextval('admin_id_seq')::text, 5, '0'),
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS student_id_seq START WITH 26001;

CREATE TABLE IF NOT EXISTS students(
      id VARCHAR(20) PRIMARY KEY DEFAULT 'STD' || nextval('student_id_seq'),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses(
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams(
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      is_correct BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (id, question_id)
);

CREATE TABLE IF NOT EXISTS attempts(
      id SERIAL PRIMARY KEY,
      student_id VARCHAR(20) NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      exam_id INT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ,
      score INT,
      UNIQUE (student_id,exam_id)
);

CREATE TABLE IF NOT EXISTS answers(
      id SERIAL PRIMARY KEY,
      attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id INT NOT NULL REFERENCES questions(id),
      choice_id INT REFERENCES choices(id),
      FOREIGN KEY (choice_id, question_id) REFERENCES choices(id, question_id),
      UNIQUE (attempt_id,question_id)
);

CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_choices_question ON choices(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam ON attempts(exam_id);
