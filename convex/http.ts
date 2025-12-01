import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Add Convex Auth HTTP routes for JWT verification and OAuth callbacks
auth.addHttpRoutes(http);

export default http;
