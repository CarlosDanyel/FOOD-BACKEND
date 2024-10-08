const { hash, compare } = require("bcryptjs");
const AppError = require("../utils/AppError");
const sqliteConect = require("../database/sqlite");

class UserController {
  async create(req, res) {
    const { name, email, password, Admin = false } = req.body;

    // Conexão ao banco de dados
    const database = await sqliteConect();

    const checkUserExists = await database.get(
      "SELECT * FROM users WHERE email = (?)",
      [email]
    );

    if (checkUserExists) {
      throw new AppError("Email ja em uso.");
    }

    const hashedPassword = await hash(password, 8);

    // Inserir o novo usuário com valor padrão para 'Admin' se não estiver presente
    await database.run(
      "INSERT INTO users (name, email, password, Admin) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, Admin]
    );

    return res.status(201).json();
  }

  async update(req, res) {
    const { name, email, password, old_password } = req.body;
    const user_id = req.user.id;

    const database = await sqliteConect();
    const user = await database.get("SELECT * FROM users WHERE id = (?)", [
      user_id,
    ]);

    if (!user) {
      throw new AppError("Usuário não encontrado");
    }

    const userUpdateEmail = await database.get(
      "SELECT * FROM users WHERE email = (?)",
      [email]
    );

    if (userUpdateEmail && userUpdateEmail.id !== user.id) {
      throw new AppError("Email ja em uso");
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;

    if (password && !old_password) {
      throw new AppError(
        "Você informar a senha antiga para definir a nova senha"
      );
    }

    if (password && old_password) {
      const checkPassword = await compare(old_password, user.password);

      if (!checkPassword) {
        throw new AppError("Senha nao confere");
      }

      user.password = await hash(password, 8);
    }

    await database.run(
      `
      UPDATE users SET
      name = ?,
      email = ?,
      password = ?,
      created_at = DATETIME('now')
      WHERE id = ?`,
      [user.name, user.email, user.password, user_id]
    );

    return res.json();
  }
}

module.exports = UserController;
