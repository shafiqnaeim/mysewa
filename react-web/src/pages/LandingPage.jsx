import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import LandingNavbar from '../components/landing/LandingNavbar'
import LandingHero from '../components/landing/LandingHero'
import LandingTrending from '../components/landing/LandingTrending'
import LandingTestimonials from '../components/landing/LandingTestimonials'
import LandingFooter from '../components/landing/LandingFooter'
import {
  fetchAverageRating,
  fetchPopularProperties,
  fetchPropertyCount,
  fetchRecentReviews,
  fetchStudentCount,
} from '../services/landingApi'

export default function LandingPage() {
  const [stats, setStats] = useState({
    propertyCount: 0,
    studentCount: 0,
    averageRating: null,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [popularItems, setPopularItems] = useState([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [popularError, setPopularError] = useState('')
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const [propertyCount, studentCount, averageRating] = await Promise.all([
        fetchPropertyCount(),
        fetchStudentCount(),
        fetchAverageRating(),
      ])
      setStats({ propertyCount, studentCount, averageRating })
    } catch {
      setStats({ propertyCount: 0, studentCount: 0, averageRating: null })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadPopular = useCallback(async () => {
    setPopularLoading(true)
    setPopularError('')
    try {
      const items = await fetchPopularProperties(6)
      setPopularItems(items)
    } catch (e) {
      setPopularItems([])
      setPopularError(e.message || 'Unable to load properties.')
    } finally {
      setPopularLoading(false)
    }
  }, [])

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    setReviewsError('')
    try {
      const items = await fetchRecentReviews(3)
      setReviews(items)
    } catch (e) {
      setReviews([])
      setReviewsError(e.message || 'Unable to load reviews.')
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
    void loadPopular()
    void loadReviews()
  }, [loadStats, loadPopular, loadReviews])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen overflow-x-hidden bg-[#FAFAFA] font-sans text-[#2D3748] site-page-with-footer"
    >
      <LandingNavbar />
      <LandingHero stats={stats} statsLoading={statsLoading} />
      <LandingTrending items={popularItems} loading={popularLoading} error={popularError} />
      <LandingTestimonials items={reviews} loading={reviewsLoading} error={reviewsError} />
      <LandingFooter />
    </motion.div>
  )
}
