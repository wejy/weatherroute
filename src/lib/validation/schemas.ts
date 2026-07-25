import { z } from "zod";

export const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  name: z.string().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});

export const discoverQuerySchema = z.object({
  origin: z.string().min(1).max(120).optional().default("Helsinki, FI"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  datePreset: z
    .enum(["today", "weekend", "week", "custom"])
    .optional()
    .default("weekend"),
  distance: z
    .enum(["near", "region", "country", "continent", "global"])
    .optional()
    .default("region"),
  weatherGoal: z
    .enum(["sun", "dry", "mild", "warm", "calm", "cloudy"])
    .optional()
    .default("sun"),
});

export const routeQuerySchema = z.object({
  from: z.string().min(1).max(120),
  to: z.string().min(1).max(120),
});

export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
export type RouteQuery = z.infer<typeof routeQuerySchema>;
