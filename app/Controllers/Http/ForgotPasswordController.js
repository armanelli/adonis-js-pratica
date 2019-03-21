"use strict";

const moment = require("moment");
const crypto = require("crypto");
const User = use("App/Models/User");
const Mail = use("Mail");

class ForgotPasswordController {
  async store({ request, response }) {
    try {
      const email = request.input("email");

      const user = await User.findByOrFail("email", email);

      user.token = crypto.randomBytes(10).toString("hex");
      user.token_created_at = new Date();

      await user.save();

      await Mail.send(
        ["emails.forgot_password"],
        {
          email,
          token: user.token,
          link: `${request.input("redirect_url")}?token=${user.token}`
        },
        message => {
          message
            .to(user.email)
            .from("rafael@creationsistemas.com.br", "Rafael | Contábil Easy")
            .subject("Recuperação de Senha");
        }
      );
    } catch (error) {
      console.log(error);
      return response.status(error.status).send({ message: "Algo deu errado.", error: error });
    }
  }

  async update({ request, response }) {
    try {
      const { password, token } = request.all();

      const user = await User.findByOrFail("token", token);

      const isTokenExpired = moment()
        .subtract("2", "days")
        .isAfter(user.token_created_at);

      if (isTokenExpired) {
        return response.status(401).send({ error: "O token de recuperação está expirado." });
      } else {
        user.token = null;
        user.token_created_at = null;
        user.password = password;

        await user.save();
      }
    } catch (error) {
      return response.status(error.status).send({ error: "Algo deu errado. Você está informando um token válido?" });
    }
  }
}

module.exports = ForgotPasswordController;
