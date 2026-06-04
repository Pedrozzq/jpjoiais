const { MercadoPagoConfig, Preference } = require("mercadopago");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://www.jpjoiasbrasil.com");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido"
    });
  }

  try {
    const items = req.body.items || [];

    if (!items.length) {
      return res.status(400).json({
        error: "Carrinho vazio"
      });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: items.map(item => ({
          title: item.name,
          quantity: Number(item.quantity),
          currency_id: "BRL",
          unit_price: Number(item.price)
        })),

        back_urls: {
          success: "https://www.jpjoiasbrasil.com/?pagamento=sucesso",
          failure: "https://www.jpjoiasbrasil.com/?pagamento=falha",
          pending: "https://www.jpjoiasbrasil.com/?pagamento=pendente"
        },

        auto_return: "approved",

        shipments: {
          mode: "not_specified",
          cost: 0,
          free_shipping: true
        }
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
