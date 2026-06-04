module.exports = async (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: "API funcionando"
  });
};
