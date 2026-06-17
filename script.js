
/* ------------------------------------------------------------
   1. ANIMAÇÕES DE ENTRADA (scroll reveal)
   ------------------------------------------------------------ */
(function initReveal(){
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(function(el){ observer.observe(el); });
})();

/* ------------------------------------------------------------
   2. CONFIGURAÇÃO DE DESTINO DOS LEADS
   ------------------------------------------------------------ */
var LEAD_CONFIG = {
  destinationEmail: "lucasoliveira.saude@outlook.com",
  // Número do WhatsApp em formato internacional (DDI 55 + DDD + número), sem espaços/símbolos.
  whatsappNumber: "5511932277961",

  // --------------------------------------------------------------
  // INTEGRAÇÃO COM FORMSPREE (envio automático de e-mail)
  // --------------------------------------------------------------
  // 1. Crie uma conta em https://formspree.io
  // 2. Crie um formulário e copie o "endpoint" gerado (algo como
  //    "https://formspree.io/f/xxxxxxxx")
  // 3. Cole o endpoint abaixo. Enquanto estiver vazio, o envio
  //    automático por e-mail fica desativado e o sistema usa
  //    apenas o redirecionamento para o WhatsApp como canal ativo.
  formspreeEndpoint: "", // ex: "https://formspree.io/f/xxxxxxxx"

  // --------------------------------------------------------------
  // INTEGRAÇÃO COM WEBHOOK GENÉRICO (Zapier, Make, n8n, etc.)
  // --------------------------------------------------------------
  webhookUrl: "", // ex: "https://hooks.zapier.com/hooks/catch/xxxx/xxxx/"

  // --------------------------------------------------------------
  // INTEGRAÇÃO COM GOOGLE SHEETS (via Google Apps Script Web App)
  // --------------------------------------------------------------
  googleSheetsWebAppUrl: "", // ex: "https://script.google.com/macros/s/xxxx/exec"

  // --------------------------------------------------------------
  // INTEGRAÇÃO COM CRM
  // --------------------------------------------------------------
  // Implemente aqui a chamada para a API do CRM utilizado
  // (RD Station, Pipedrive, HubSpot, etc.), seguindo a
  // documentação específica de cada plataforma.
  crmEndpoint: ""
};

/* ------------------------------------------------------------
   3. ENVIO DO FORMULÁRIO
   ------------------------------------------------------------ */
var form = document.getElementById('quoteForm');
var submitBtn = document.getElementById('submitBtn');
var successBox = document.getElementById('successBox');

form.addEventListener('submit', function(e){
  e.preventDefault();

  var tipoSelecionado = form.querySelector('input[name="tipo"]:checked');
  if (!form.checkValidity() || !tipoSelecionado){
    form.reportValidity();
    return;
  }

  var lead = {
    nome: form.nome.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
    cidade: form.cidade.value.trim(),
    tipo: tipoSelecionado.value,
    quantidade: form.qtd.value.trim(),
    faixaEtaria: form.faixa.value
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  enviarLead(lead).finally(function(){
    mostrarSucesso();
    abrirWhatsApp(lead);
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = "Receber Cotação";
  });
});

/* Monta o texto padrão do pedido de cotação */
function montarMensagem(lead){
  return [
    "Novo pedido de cotação Bradesco Saúde",
    "",
    "Nome: " + lead.nome,
    "WhatsApp: " + lead.whatsapp,
    "Cidade/Estado: " + lead.cidade,
    "Tipo de contratação: " + lead.tipo,
    "Quantidade de pessoas: " + lead.quantidade,
    "Faixa etária: " + lead.faixaEtaria
  ].join("\n");
}

/* Envia o lead para os destinos configurados (e-mail / webhook / sheets / CRM) */
function enviarLead(lead){
  var mensagem = montarMensagem(lead);
  var promises = [];

  // --- E-MAIL via Formspree (ativo somente se o endpoint for configurado) ---
  if (LEAD_CONFIG.formspreeEndpoint){
    promises.push(
      fetch(LEAD_CONFIG.formspreeEndpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          _replyto: LEAD_CONFIG.destinationEmail,
          nome: lead.nome,
          whatsapp: lead.whatsapp,
          cidade: lead.cidade,
          tipo: lead.tipo,
          quantidade: lead.quantidade,
          faixaEtaria: lead.faixaEtaria,
          mensagem: mensagem
        })
      }).catch(function(err){ console.warn("Falha ao enviar via Formspree:", err); })
    );
  }

  // --- WEBHOOK genérico (Zapier / Make / n8n) ---
  if (LEAD_CONFIG.webhookUrl){
    promises.push(
      fetch(LEAD_CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      }).catch(function(err){ console.warn("Falha ao enviar para webhook:", err); })
    );
  }

  // --- GOOGLE SHEETS via Apps Script Web App ---
  if (LEAD_CONFIG.googleSheetsWebAppUrl){
    promises.push(
      fetch(LEAD_CONFIG.googleSheetsWebAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      }).catch(function(err){ console.warn("Falha ao enviar para Google Sheets:", err); })
    );
  }

  // --- CRM (placeholder — implementar conforme a plataforma escolhida) ---
  if (LEAD_CONFIG.crmEndpoint){
    promises.push(
      fetch(LEAD_CONFIG.crmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      }).catch(function(err){ console.warn("Falha ao enviar para CRM:", err); })
    );
  }

  return Promise.all(promises);
}

/* Abre o WhatsApp com a mensagem pré-preenchida para o número do consultor.
   Observação: por se tratar de uma solução 100% client-side (sem backend),
   o visitante precisa confirmar o envio da mensagem dentro do WhatsApp —
   não é possível enviar mensagens de forma totalmente silenciosa sem uma
   API de WhatsApp Business com backend dedicado. */
function abrirWhatsApp(lead){
  var texto = encodeURIComponent(montarMensagem(lead));
  var url = "https://wa.me/" + LEAD_CONFIG.whatsappNumber + "?text=" + texto;
  window.open(url, "_blank");
}

/* Exibe a mensagem de sucesso e oculta o formulário */
function mostrarSucesso(){
  form.style.display = "none";
  successBox.classList.add('is-visible');
}
