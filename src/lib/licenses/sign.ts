import crypto from "crypto";

type LicensePayload = {
  id: string;
  orgId: string;
  customer: string;
  edition: string;
  issuedAt: string;
  expiresAt: string;
  maxRepos: number;
  features: string[];
};

export function signLicense(data: LicensePayload): { encodedLicense: string } {
  const pem = process.env.ED25519_PRIVATE_KEY;
  if (!pem) {
    throw new Error("ED25519_PRIVATE_KEY environment variable is not set");
  }

  const privateKey = crypto.createPrivateKey(pem.replace(/\\n/g, "\n"));
  const keyType = privateKey.asymmetricKeyType;

  const payload = {
    licenseId: data.id,
    orgId: data.orgId,
    customer: data.customer,
    edition: data.edition,
    issuedAt: data.issuedAt,
    expiresAt: data.expiresAt,
    maxRepos: data.maxRepos,
    features: data.features,
  };

  const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());

  const algorithm = keyType === "ed25519" ? null : "sha256";
  const signature = crypto.sign(algorithm, Buffer.from(payloadJson), privateKey);

  const envelope = {
    payload,
    signature: signature.toString("base64"),
    algorithm: keyType === "ed25519" ? "Ed25519" : "RSA-SHA256",
    version: 1,
  };

  return {
    encodedLicense: Buffer.from(JSON.stringify(envelope)).toString("base64"),
  };
}
