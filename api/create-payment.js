const { MercadoPagoConfig, Preference } = require("mercadopago");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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

    const items = req.body.items || [];

    const result = await preference.create({
      body: {
        items: items.map(item => ({
          title: item.name,
          quantity: Number(item.quantity),
          currency_id: "BRL",
          unit_price: Number(item.price)
        }))
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
