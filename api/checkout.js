const { MercadoPagoConfig, Preference } = require("mercadopago");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://www.jpjoiasbrasil.com");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const items = req.body.items || [];
    const shipping = req.body.shipping || {};

    if (!items.length) {
      return res.status(400).json({ error: "Carrinho vazio" });
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
        },

        metadata: {
          nome: shipping.nome,
          whatsapp: shipping.whatsapp,
          cep: shipping.cep,
          rua: shipping.rua,
          numero: shipping.numero,
          bairro: shipping.bairro,
          cidade: shipping.cidade,
          estado: shipping.estado
        }
      }
    });

    const total = items.reduce((acc, item) => {
      return acc + Number(item.price) * Number(item.quantity);
    }, 0);

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "JP Joias <onboarding@resend.dev>",
        to: process.env.DESTINATION_EMAIL,
        subject: "Novo pedido iniciado - JP Joias",
        html: `
          <h2>Novo pedido iniciado</h2>

          <h3>Cliente</h3>
          <p><strong>Nome:</strong> ${shipping.nome || ""}</p>
          <p><strong>WhatsApp:</strong> ${shipping.whatsapp || ""}</p>

          <h3>Endereço</h3>
          <p>
            ${shipping.rua || ""}, ${shipping.numero || ""}<br>
            ${shipping.bairro || ""}<br>
            ${shipping.cidade || ""} - ${shipping.estado || ""}<br>
            CEP: ${shipping.cep || ""}
          </p>

          <h3>Produtos</h3>
          <ul>
            ${items.map(item => `
              <li>
                ${item.quantity}x ${item.name} - R$ ${Number(item.price).toFixed(2)}
              </li>
            `).join("")}
          </ul>

          <h3>Total</h3>
          <p><strong>R$ ${total.toFixed(2)}</strong></p>

          <p><strong>Checkout Mercado Pago:</strong> ${result.init_point}</p>
        `
      })
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
