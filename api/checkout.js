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

    const total = items.reduce((acc, item) => {
      return acc + Number(item.price) * Number(item.quantity);
    }, 0);

    const enderecoCompleto = `
      ${shipping.rua || ""}, ${shipping.numero || ""}
      ${shipping.complemento ? " - " + shipping.complemento : ""}
      ${shipping.bairro || ""}
      ${shipping.cidade || ""} - ${shipping.estado || ""}
      CEP: ${shipping.cep || ""}
    `;

    const result = await preference.create({
      body: {
        items: items.map(item => ({
          title: item.name,
          quantity: Number(item.quantity),
          currency_id: "BRL",
          unit_price: Number(item.price)
        })),

        payer: {
          name: shipping.nome || "",
          phone: {
            number: shipping.whatsapp || ""
          },
          address: {
            zip_code: shipping.cep || "",
            street_name: shipping.rua || "",
            street_number: shipping.numero || ""
          }
        },

        back_urls: {
          success: "https://www.jpjoiasbrasil.com/?pagamento=sucesso",
          failure: "https://www.jpjoiasbrasil.com/?pagamento=falha",
          pending: "https://www.jpjoiasbrasil.com/?pagamento=pendente"
        },

        auto_return: "approved",

        shipments: {
          mode: "not_specified",
          cost: 0,
          free_shipping: true,
          receiver_address: {
            zip_code: shipping.cep || "",
            street_name: shipping.rua || "",
            street_number: shipping.numero || "",
            floor: shipping.complemento || "",
            apartment: shipping.bairro || "",
            city_name: shipping.cidade || "",
            state_name: shipping.estado || ""
          }
        },

        metadata: {
          nome: shipping.nome || "",
          whatsapp: shipping.whatsapp || "",
          cep: shipping.cep || "",
          rua: shipping.rua || "",
          numero: shipping.numero || "",
          complemento: shipping.complemento || "",
          bairro: shipping.bairro || "",
          cidade: shipping.cidade || "",
          estado: shipping.estado || "",
          endereco_completo: enderecoCompleto.trim()
        }
      }
    });

    try {
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
            <h2>Novo pedido iniciado - JP Joias</h2>

            <h3>Cliente</h3>
            <p><strong>Nome:</strong> ${shipping.nome || "Não informado"}</p>
            <p><strong>CPF:</strong> ${shipping.cpf || "Não informado"}</p>
            <p><strong>WhatsApp:</strong> ${shipping.whatsapp || "Não informado"}</p>
            

            <h3>Endereço de entrega</h3>
            <p>
              <strong>CEP:</strong> ${shipping.cep || "Não informado"}<br>
              <strong>Rua:</strong> ${shipping.rua || "Não informado"}<br>
              <strong>Número:</strong> ${shipping.numero || "Não informado"}<br>
              <strong>Complemento:</strong> ${shipping.complemento || "Não informado"}<br>
              <strong>Bairro:</strong> ${shipping.bairro || "Não informado"}<br>
              <strong>Cidade:</strong> ${shipping.cidade || "Não informado"}<br>
              <strong>Estado:</strong> ${shipping.estado || "Não informado"}
            </p>

            <h3>Produtos</h3>
            <ul>
              ${items.map(item => `
                <li>
                  ${Number(item.quantity)}x ${item.name} - R$ ${Number(item.price).toFixed(2)}
                </li>
              `).join("")}
            </ul>

            <h3>Total</h3>
            <p><strong>R$ ${total.toFixed(2)}</strong></p>

            <p>
              <strong>Checkout Mercado Pago:</strong><br>
              <a href="${result.init_point}">${result.init_point}</a>
            </p>

            <hr>

            <p style="font-size:12px;color:#666;">
              Atenção: este pedido foi iniciado no site. Confirme no Mercado Pago se o pagamento foi aprovado antes de enviar.
            </p>
          `
        })
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail:", emailError);
    }

    return res.status(200).json({
      init_point: result.init_point
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
