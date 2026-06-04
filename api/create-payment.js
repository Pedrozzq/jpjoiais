const { MercadoPagoConfig, Preference } = require("mercadopago");

module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido"
    });
  }

  try {

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            title: "Produto Teste JP Joias",
            quantity: 1,
            currency_id: "BRL",
            unit_price: 1
          }
        ]
      }
    });

    return res.status(200).json({
      init_point: result.init_point
    });

  } catch (error) {

    return res.status(500).json({
      error: error.message
    });

  }

};
