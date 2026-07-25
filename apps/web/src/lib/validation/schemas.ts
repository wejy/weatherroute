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

export const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const discoverQuerySchema = z.object({
  origin: z.string().min(1).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  datePreset: z
    .enum(["today", "tomorrow", "weekend", "custom"])
    .optional()
    .default("weekend"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  distance: z
    .enum([
      "near",
      "semi",
      "surroundings",
      "neighborhood",
      "region",
      "continent",
      "custom",
    ])
    .optional()
    .default("region"),
  radiusKm: z.coerce.number().min(0).max(2000).optional(),
  weatherGoal: z
    .enum(["best", "sun", "dry", "mild", "rain", "warm", "calm", "cloudy"])
    .optional()
    .default("best"),
});

export const routeQuerySchema = z.object({
  from: z.string().min(1).max(120),
  to: z.string().min(1).max(120),
});

export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type ReverseQuery = z.infer<typeof reverseQuerySchema>;
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
export type RouteQuery = z.infer<typeof routeQuerySchema>;
