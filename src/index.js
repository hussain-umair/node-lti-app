import express from "express";
import fs from "fs/promises";
import {
  ltiProvidersFilePath,
  PORT,
  vidizmoDataFilePath,
} from "./utils/constants.js";
import path from "path";

// http://localhost:3000/lti/registration -> registration link to enter in moodle

const ltiProviders = [];
// to understand dynamic registration on moodle -> https://moodlelti.theedtech.dev/dynreg/
// for below contract explanation: https://openid.net/specs/openid-connect-registration-1_0.html
const ltiProviderDynamicRegistrationPayload = {
  issuer: "", // case sensitive url, contains schema, host, path components, no query or fragment components, and optionally port
  token_endpoint: "",
  token_endpoint_auth_methods_supported: [], // ["private_key_jwt"]
  token_endpoint_auth_signing_alg_values_supported: [], // ["RS256"]
  jwks_uri: "", // "http://moodle.lms.com/mod/lti/certs.php" // to get a key to decrypt platforms responses
  authorization_endpoint: "", // URL of OAuth authorization endpoint
  registration_endpoint: "", // url of registration endpoint, maybe one time use only endpoint and/or protected by access token
  response_types_supported: [], // ["id_token"] moodle specific property -> // default 'code' for openid connect registration
  subject_types_supported: [], // ["public", "pairwise"]
  id_token_signing_alg_values_supported: ["RS256"], // [] moodle specific property ->
  claims_supported: [], // ["sub","iss","name","given_name","family_name","email"] moodle specific ->
  "https://purl.imsglobal.org/spec/lti-platform-configuration": {}, // platform configuration
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/lti/registration", async (req, res) => {
  console.log("server got hit=> ", req.query);

  const {
    query: { openid_configuration, registration_token },
  } = req;

  if (openid_configuration) {
    try {
      const openIdConfiguration = await fetch(openid_configuration, {
        method: "GET",
        headers: { "content-type": "application/json" },
      }).then((res) => {
        return res.json();
      });
      debugger;
      const { registration_endpoint } = openIdConfiguration;

      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${registration_token}`,
          "Content-Type": "application/json", // this is must
        },
        body: JSON.stringify({
          application_type: "web",
          response_types: ["id_token"],
          grant_types: ["implicit", "client_credentials"],
          initiate_login_uri: "http://localhost:3000/login",
          redirect_uris: ["http://localhost/oidc/launch"],
          client_name: "Vidizmo",
          jwks_uri: "http://localhost/jwks-uri",
          token_endpoint_auth_method: "private_key_jwt",
          "https://purl.imsglobal.org/spec/lti-tool-configuration": {
            domain: "localhost:3000",
            target_link_uri: "http://localhost:3000",
            custom_parameters: {
              context_id_history: "$Context.id.history",
              context_start_date: "$CourseSection.timeFrame.begin",
              context_end_date: "$CourseSection.timeFrame.end",
              resource_link_history: "$ResourceLink.id.history",
              resource_available_start: "$ResourceLink.available.startDateTime",
              resource_available_end: "$ResourceLink.available.endDateTime",
              resource_submission_start:
                "$ResourceLink.submission.startDateTime",
              resource_submission_end: "$ResourceLink.submission.endDateTime",
            },
            claims: ["iss", "sub", "name", "give_name", "family_name"],
            messages: [
              {
                type: "LtiDeepLinkingRequest",
                target_link_uri: "http://localhost:3000/lti-deep-link",
                label: "Add Vidizmo",
              },
            ],
          },
          scope:
            "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
        }),
      };
      const ltiPlatformDetails = await fetch(
        registration_endpoint,
        options
      ).then((res) => res.json());

      await fs.writeFile(
        ltiProvidersFilePath,
        JSON.stringify({
          platformConfiguration: openIdConfiguration,
          toolConfiguration: ltiPlatformDetails,
        })
      );

      const successHtmlViewPath = path.join(process.cwd(), "src", "index.html");
      return res.sendFile(successHtmlViewPath);
    } catch (e) {
      console.log("error=> ", e);
      res.status(500).json({ message: e?.message || "error message" });
    }
  }
});

app.get("/oidc/launch", (req, res) => {
  console.log("/oidc/launch got hit=> ", req);
  res.status(200).json({ message: "success" });
});
app.get("/lti-deep-link", (req, res) => {
  console.log("lti-deep-link=> ", req);

  res.status(200).json({ message: "success" });
});
app.get("/jwks-uri", (req, res) => {
  console.log("jwks-uri route got hit=> ", req);
  const keys = {
    keys: [
      {
        kty: "RSA",
        alg: "RS256",
        kid: "01ba1793956a518613ba",
        e: "AQAB",
        n: "0ug5V8lMqYvk2bMbcHMOqAOk5lfT9kTsOZl0D34iGEy8bO9xMUTIOmHQwa9HodcyXpGPMLNiggIZV6t_NKvcK9oFrA2fdrrBLkMzgy6a1SV4qENcTPHxjjtdmmWjUkA85X1bzykF9nrUDLoU0to5s3529NfN5F75xWXKQAGYXWsQiz_MKhPCwzH187XIVLHmdImH_okYoUDSGI0_AhnvlpL7aHUzZ5pBjZdLCeCgG4iAn19lGqSFD5MqQD14UkEtMKaClR7ODD20Sc9nionpPZvWzLWxeSP_dmvOZcSbrj5ZyA1aXVL3GSd403FNgGiwgi12WZBXtlqzXA0a6fmIuQ",
        use: "sig",
      },
    ],
  };
  res.status(200).json({ keys });
});
app.get("/redirect", (req, res) => {
  console.log("redirect route got hit=> ", req);
  res.status(301).json({ message: "redirecting!" });
});
app.get("/login", (req, res) => {
  console.log("login get route got hit=> ", req);

  res.status(200).json({ message: "success" });
});
app.post("/login", async (req, res) => {
  debugger;
  console.log("login post route got hit=> ");
  const { body } = req;
  if (!body) return res.status(404).json({ message: "not found" });

  const {
    iss,
    client_id,
    lti_deployment_id,
    target_link_uri,
    login_hint,
    lti_message_hint,
  } = body;
  // here we will make get request to moodle/auth.php with query strings
  // scope, response_type, response_mode, prompt, client_id, redirect_uri, state, nonce, login_hint, lti_message_hint

  const ltiProvider = await fs.readFile(ltiProvidersFilePath);
  const {
    platformConfiguration: { authorization_endpoint },
  } = JSON.parse(ltiProvider);

  console.log("body=> ", req.body);
  res.redirect(`${authorization_endpoint}?
  scope=openid
  &responseType=id_token
  &clientid=${client_id}
  &redirecturi=http://localhost/oidc/launch
  &loginhint=${login_hint}
  &responsemode=form-data
  &nonce=0ug5V8lMqYvk2bMbcHMOqAOk5lfT9kTsOZl0D34iGEy8bO9xMUTIOmHQwa9HodcyXpGPMLNiggIZV6t_NKvcK9oFrA2fdrrBLkMzgy6a1SV4qENcTPHxjjtdmmWjUkA85X1bzykF9nrUDLoU0to5s3529NfN5F75xWXKQAGYXWsQiz_MKhPCwzH187XIVLHmdImH_okYoUDSGI0_AhnvlpL7aHUzZ5pBjZdLCeCgG4iAn19lGqSFD5MqQD14UkEtMKaClR7ODD20Sc9nionpPZvWzLWxeSP_dmvOZcSbrj5ZyA1aXVL3GSd403FNgGiwgi12WZBXtlqzXA0a6fmIuQ`);
  // res.status(200).json({ message: 'success' })
});

app.get("/lti-providers", async (_req, res) => {
  const vidizmoContent = Array.from({ length: 50 }).map((_, index) => {
    return {
      id: index,
      title: `Vidizmo_Cotent_${index}`,
    };
  });
  try {
    await fs.writeFile(vidizmoDataFilePath, JSON.stringify(vidizmoContent));
    const ltiProviders = await fs.readFile(ltiProvidersFilePath);

    res.status(200).json({ data: JSON.parse(ltiProviders) });
  } catch (e) {
    res.status(500).json({ message: e?.message });
  }
});

app.listen(PORT, () => {
  console.log("server is running on " + PORT);
});
