const validator = require("validator");

// List of disposable/temporary email domains
const disposableDomains = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "throwaway.email",
  "temp-mail.org",
  "mailnator.com",
  "fakeinbox.com",
  "spamgourmet.com",
  "trashmail.com",
  "mailcatch.com",
  "getairmail.com",
  "mailnesia.com",
  "guerrillamail.net",
  "sharklasers.com",
  "guerrillamail.org",
  "guerrillamail.biz",
  "mailmetrash.com",
  "tempinbox.com",
  "tempemail.net",
  "emailondeck.com",
  "mailtemp.net",
  "tempail.com",
  "tempmail.net",
  "temp-mail.net",
  "mintemail.com",
  "mytrashmail.com",
  "trash2009.com",
  "trashdevil.com",
  "trashmail.net",
  "trashmail.org",
  "trashmail.ws",
  "twinmail.de",
  "tyldd.com",
  "uggsrock.com",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "wh4f.org",
  "whyspam.me",
  "willselfdestruct.com",
  "winemaven.info",
  "wronghead.com",
  "wuzup.net",
  "xagloo.com",
  "xemaps.com",
  "xents.com",
  "xmaily.com",
  "xoxy.net",
  "yep.it",
  "yogamaven.com",
  "yopmail.fr",
  "yopmail.net",
  "ypmail.webarnak.fr.eu.org",
  "yuurok.com",
  "zehnminutenmail.de",
  "zippymail.info",
  "zoaxe.com",
  "zoemail.org",
  "temp-mail.org",
  "0box.eu",
  "0wnd.net",
  "0wnd.org",
  "10minutemail.co.za",
  "10minutemail.com",
  "123-m.com",
  "1pad.de",
  "1zhuan.com",
  "20minutemail.com",
  "21cn.com",
  "2prong.com",
  "30minutemail.com",
  "33mail.com",
  "3d-painting.com",
  "4gfdsgafg.com",
  "4mail.com",
  "4warding.com",
  "5mail.com",
  "6mail.com",
  "7mail.com",
  "8mail.com",
  "9mail.com",
];

// Professional/Educational domains (allowed)
const allowedDomains = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "aol.com",
  // University domains (add your university)
  "edu.pk",
  "university.edu",
  "uol.edu.pk",
  "nust.edu.pk",
];

const validateEmail = (email) => {
  // Check if email is empty
  if (!email) {
    return { isValid: false, message: "Email is required" };
  }

  // Check if email format is valid
  if (!validator.isEmail(email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }

  // Check email length
  if (email.length > 100) {
    return { isValid: false, message: "Email address is too long" };
  }

  // Extract domain
  const domain = email.split("@")[1].toLowerCase();

  // Check if it's a disposable/temporary email
  if (disposableDomains.includes(domain)) {
    return {
      isValid: false,
      message:
        "Disposable/temporary email addresses are not allowed. Please use a real email address.",
    };
  }

  // Check for common typos in professional domains
  const commonTypos = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "hotmal.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "yahooo.com": "yahoo.com",
  };

  if (commonTypos[domain]) {
    return {
      isValid: false,
      message: `Did you mean ${commonTypos[domain]}? Please correct your email address.`,
    };
  }

  return { isValid: true, message: "Email is valid" };
};

const isAcademicEmail = (email) => {
  const domain = email.split("@")[1].toLowerCase();
  // Check for .edu or university domains
  return (
    domain.includes(".edu") ||
    domain.includes("university") ||
    domain.includes("college") ||
    allowedDomains.some((allowed) => domain === allowed)
  );
};

module.exports = { validateEmail, isAcademicEmail, disposableDomains };
