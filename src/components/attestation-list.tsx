import { Shield, Award, FileCheck, LinkIcon, Star, MessageSquare } from "lucide-react"
import type { AttestationQueryResult } from "@/lib/attestation-queries"

interface AttestationListProps {
  attestations: AttestationQueryResult[]
}

const schemaIcons: Record<string, any> = {
  'certification': Award,
  'endorsement': FileCheck,
  'linked-identifier': LinkIcon,
  'security-assessment': Shield,
  'user-review': Star,
  'user-review-response': MessageSquare,
}

export function AttestationList({ attestations }: AttestationListProps) {
  if (attestations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No attestations yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {attestations.map((attestation) => {
        const Icon = schemaIcons[attestation.schemaId || ''] || Shield
        const date = new Date(attestation.time * 1000).toLocaleDateString()
        const attesterShort = `${attestation.attester.slice(0, 6)}...${attestation.attester.slice(-4)}`

        return (
          <div 
            key={attestation.uid}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-gray-900">{attestation.schemaTitle}</h4>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{date}</span>
                </div>
                
                {attestation.decodedData?.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < (attestation.decodedData?.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                {attestation.decodedData?.comment && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    &ldquo;{attestation.decodedData.comment}&rdquo;
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  By {attesterShort}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
