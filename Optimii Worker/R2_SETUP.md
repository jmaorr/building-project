# Cloudflare R2 Setup Guide

## Why R2?

Cloudflare R2 is the best choice for file storage in your Cloudflare Workers setup because:
- ✅ **No egress fees** - Unlike AWS S3, you don't pay for data transfer
- ✅ **S3-compatible API** - Easy integration with existing tools
- ✅ **Integrated with Workers** - Direct access from your Worker code
- ✅ **Global CDN** - Fast access worldwide
- ✅ **Competitive pricing** - $0.015/GB/month

## Setup Steps

### 1. Create R2 Bucket

```bash
# Create the bucket via Wrangler CLI
wrangler r2 bucket create optimii-files
```

Or create it via the Cloudflare Dashboard:
1. Go to https://dash.cloudflare.com
2. Navigate to R2 → Create bucket
3. Name it `optimii-files`
4. Choose a location (or leave default)

### 2. Configure Public Access (Optional)

To serve files directly from R2, you have two options:

#### Option A: R2.dev Subdomain (Easiest)
1. In Cloudflare Dashboard → R2 → Your bucket
2. Go to Settings → Public Access
3. Enable "Allow Access" and note your public URL
4. Update the `uploadToR2` function in `src/lib/storage/r2.ts` with your actual public URL

#### Option B: Custom Domain (Recommended for Production)
1. Create a custom domain in R2 settings
2. Point a subdomain (e.g., `files.optimii.com`) to your R2 bucket
3. Update the public URL in the code

### 3. Update wrangler.toml

The R2 binding is already configured in `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "optimii-files"
```

### 4. Access R2 in Server Actions

The R2 bucket is available in Cloudflare Workers via `env.R2_BUCKET`. However, in Next.js server actions, you need to access it through the runtime context.

For now, the code includes a fallback that uses placeholder URLs when R2 is not available. Once deployed to Cloudflare, R2 will be accessible.

### 5. Update Public URL

After setting up public access, update `src/lib/storage/r2.ts`:

```typescript
// Replace this line:
const publicUrl = `https://pub-<account-id>.r2.dev/${path}`;

// With your actual R2 public URL:
const publicUrl = `https://<your-r2-public-url>/${path}`;
```

## File Organization

Files are organized in R2 with this structure:
```
projects/
  {projectId}/
    stages/
      {stageId}/
        rounds/
          {roundNumber}/
            {timestamp}-{filename}
```

Example:
```
projects/proj-1/stages/stage-1/rounds/1/1701234567890-design-plan.pdf
```

## Testing

1. Deploy to Cloudflare: `wrangler deploy`
2. Upload a file through the UI
3. Check R2 bucket in Cloudflare Dashboard to verify the file was uploaded
4. Test file download/access

## Cost Estimation

For a typical project:
- 100 projects × 10 files each × 5MB average = ~5GB
- Monthly cost: 5GB × $0.015 = **$0.075/month**
- Plus free tier: 10GB free storage included

## Security Considerations

1. **Access Control**: Consider using signed URLs for private files
2. **File Size Limits**: Add validation for max file size (recommended: 50MB per file)
3. **File Type Validation**: Restrict allowed file types
4. **Virus Scanning**: Consider adding virus scanning for uploaded files

## Next Steps

1. Create the R2 bucket
2. Configure public access
3. Update the public URL in the code
4. Deploy and test
5. Consider adding file size and type validation
6. Implement signed URLs for private files if needed

