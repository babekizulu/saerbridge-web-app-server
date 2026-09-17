"use strict";

const CONTACT_EMAIL = "we@saerbridge.com";

const legalConfig = {
  companyLegalName: "Saerbridge (Pty) Ltd.",
  brandName: "saerbridge.",
  tradingName: "saerbridge.",
  founder: "Lwandle B Dlamini",
  foundedYear: 2026,
  contactEmail: CONTACT_EMAIL,
  privacyPolicyVersion: "2026.09.1",
  termsVersion: "2026.09.1",
  ethicsVersion: "2026.09.1",
  aiNoticeVersion: "2026.09.1",
  accessibilityStatementVersion: "2026.09.1",
  openaiPrivacyUrl: "https://openai.com/policies/privacy-policy",
  openaiDataUsageUrl: "https://openai.com/policies/api-data-usage-policies",
  informationRegulatorUrl: "https://inforegulator.org.za/",
  paypalAccountEmail: "babekizulu@gmail.com",
  legalReviewRequired: true,
};

function publicLegalConfig(runtimeLegal) {
  return {
    ...legalConfig,
    companyRegistrationNumber: runtimeLegal.companyRegistrationNumber,
    informationOfficer: {
      name: runtimeLegal.informationOfficerName,
      email: runtimeLegal.informationOfficerEmail,
      phone: runtimeLegal.informationOfficerPhone,
    },
    registeredAddress: runtimeLegal.registeredAddress,
  };
}

module.exports = { legalConfig, publicLegalConfig, CONTACT_EMAIL };
