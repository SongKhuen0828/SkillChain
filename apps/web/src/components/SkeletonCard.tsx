import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      {/* Image Skeleton */}
      <Skeleton className="h-48 w-full" />
      
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        
        {/* Button Skeleton */}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

