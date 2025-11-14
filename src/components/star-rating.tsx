import { Star } from "lucide-react"

interface StarRatingProps {
  rating: number
  count: number
  size?: "sm" | "md" | "lg"
}

export function StarRating({ rating, count, size = "md" }: StarRatingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  const stars = []
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.floor(rating)
    const partial = i === Math.ceil(rating) && rating % 1 !== 0
    
    stars.push(
      <Star
        key={i}
        className={`${sizeClasses[size]} ${
          filled ? "fill-yellow-400 text-yellow-400" : 
          partial ? "fill-yellow-200 text-yellow-400" : 
          "text-gray-300"
        }`}
      />
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">{stars}</div>
      <span className="text-sm text-gray-600">
        {rating.toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  )
}
