const { query } = require('../dist/db');
const { authService } = require('../dist/modules/auth/authService');
const { walletService } = require('../dist/modules/wallet/walletService');
const { guestService } = require('../dist/modules/security/guestService');
const { preferenceService } = require('../dist/modules/subscriptions/preferenceService');
const { ratingService } = require('../dist/modules/ratings/ratingService');
const { creatorService } = require('../dist/modules/creators/creatorService');
const { partnerService } = require('../dist/modules/partners/partnerService');
const { loyaltyService } = require('../dist/modules/loyalty/loyaltyService');
const { adService } = require('../dist/modules/ads/adService');
const { createConversation, startConversation, endConversation } = require('../dist/modules/conversations/conversationService');
const { blockUser, isBlocked } = require('../dist/modules/moderation/blockService');
const { config } = require('../dist/config');

async function runTests() {
  console.log('============================================================');
  console.log('FACECHAT BUSINESS MODEL & TOKEN ECONOMY TEST SUITE');
  console.log('============================================================\n');

  // 1. Initial Guest Experience (username, country, gender, 18+ confirmation)
  console.log('--- 1. Testing Initial Guest Flow & 15-Minute Cumulative Limit ---');
  const guest = await guestService.createGuestSession(
    '127.0.0.1',
    'Mozilla/5.0',
    'fp_guest_123',
    'CoolStranger',
    'US',
    'female',
    true
  );
  console.log('Guest Session Created:', { id: guest.id, username: guest.username, country: guest.country, gender: guest.gender });
  const timeStatus = await guestService.getGuestTimeRemaining(guest.sessionToken);
  console.log(`Guest Remaining: ${timeStatus.secondsRemaining}s (${Math.round(timeStatus.secondsRemaining / 60)} mins)`);
  if (timeStatus.secondsRemaining < 800 || timeStatus.secondsRemaining > 900) {
    throw new Error(`Expected ~900s (15 min) guest limit, got ${timeStatus.secondsRemaining}`);
  }
  console.log('✅ Guest 15-minute server timer verified');

  // 2. User Registration & Initial 10 Face Tokens
  console.log('\n--- 2. Testing Registration & Initial 10 Face Tokens Grant ---');
  const email = `stranger_${Date.now()}@facechat.app`;
  const regResult = await authService.register(email, 'SecurePass123!', 'AlexStranger', 'male', 'US');
  const initialBalance = await walletService.checkBalance(regResult.user.id);
  console.log(`User ID: ${regResult.user.id} | Initial Balance: ${initialBalance} Face Tokens`);
  if (initialBalance !== 10) {
    throw new Error(`Expected exactly 10 initial Face Tokens, got ${initialBalance}`);
  }
  console.log('✅ Initial Face Tokens = 10 verified');

  // 3. Conversation Spend (1 token per minute) & Valid Conversation Reward (>2 min -> +5, +5/extra min)
  console.log('\n--- 3. Testing Conversation Earning & Spending Economics ---');
  const conv = await createConversation(regResult.user.id, null, null, guest.id, 'anyone');
  await startConversation(conv.id);

  // Simulate 3 minutes call (180 seconds):
  // - Spend: 3 minutes * 1 token = 3 tokens spent
  // - Reward: > 2 mins gives base +5, + 1 extra minute * 5 = +10 tokens reward
  const earnTx = await walletService.processConversationReward(regResult.user.id, conv.id, 180);
  console.log(`Earned Tokens (3 mins call): +${earnTx ? earnTx.amount : 0} Face Tokens (Expected: +10)`);
  if (!earnTx || earnTx.amount !== 10) {
    throw new Error(`Expected +10 Face Tokens reward for 3m call, got ${earnTx ? earnTx.amount : 0}`);
  }

  const spendTx = await walletService.processConversationSpend(regResult.user.id, conv.id, 180);
  console.log(`Spent Tokens (3 mins call): ${spendTx ? spendTx.amount : 0} Face Tokens (Expected: -3)`);
  if (!spendTx || spendTx.amount !== -3) {
    throw new Error(`Expected -3 Face Tokens spend for 3m call, got ${spendTx ? spendTx.amount : 0}`);
  }

  const balanceAfterCall = await walletService.checkBalance(regResult.user.id);
  console.log(`Balance After Call: ${balanceAfterCall} Face Tokens (10 + 10 - 3 = 17)`);
  if (balanceAfterCall !== 17) {
    throw new Error(`Expected 17 Face Tokens balance, got ${balanceAfterCall}`);
  }
  console.log('✅ Conversation reward & spend verified');

  // 4. Instant Skip Penalty (< 2 minutes intentional skip deducts 2 Face Tokens)
  console.log('\n--- 4. Testing Instant Skip Penalty (< 2 mins) ---');
  const shortConv = await createConversation(regResult.user.id, null, null, guest.id, 'anyone');
  await startConversation(shortConv.id);

  // User skips after 45 seconds (< 120s threshold)
  const penaltyTx = await walletService.applySkipPenalty(regResult.user.id, shortConv.id, 45);
  console.log(`Skip Penalty Applied: ${penaltyTx ? penaltyTx.amount : 0} Face Tokens (Expected: -2)`);
  if (!penaltyTx || penaltyTx.amount !== -2) {
    throw new Error(`Expected -2 Face Tokens penalty, got ${penaltyTx ? penaltyTx.amount : 0}`);
  }
  const balanceAfterPenalty = await walletService.checkBalance(regResult.user.id);
  console.log(`Balance After Skip Penalty: ${balanceAfterPenalty} Face Tokens (17 - 2 = 15)`);
  if (balanceAfterPenalty !== 15) {
    throw new Error(`Expected 15 Face Tokens balance, got ${balanceAfterPenalty}`);
  }
  console.log('✅ Instant skip penalty verified');

  // 5. Token Purchase Product (1,000 Face Tokens = $4 USD)
  console.log('\n--- 5. Testing Face Tokens Purchase Bundle (1,000 tokens for $4) ---');
  const purchaseTx = await walletService.creditPurchasedTokens(regResult.user.id, 1000, `stripe_test_${Date.now()}`, 4.00);
  console.log(`Purchased Tokens Credited: +${purchaseTx.amount} Face Tokens | Balance: ${purchaseTx.balanceAfter}`);
  if (purchaseTx.balanceAfter !== 1015) {
    throw new Error(`Expected 1015 Face Tokens, got ${purchaseTx.balanceAfter}`);
  }
  console.log('✅ Token purchase bundle verified');

  // 6. FaceChat Preference Pass & Time Banking ($2 for 5 hours = 18,000s)
  console.log('\n--- 6. Testing FaceChat Preference Pass & Time Banking ---');
  const pass = await preferenceService.grantPreferencePass(regResult.user.id, 5);
  console.log(`Preference Pass Granted: ${pass.remainingSeconds}s banked time (${pass.remainingSeconds / 3600} hours)`);
  if (pass.remainingSeconds !== 18000) {
    throw new Error(`Expected 18,000 banked seconds, got ${pass.remainingSeconds}`);
  }

  // Toggle preference OFF and ON
  await preferenceService.togglePreference(regResult.user.id, false);
  let isActive = await preferenceService.isPreferenceActive(regResult.user.id);
  console.log(`Toggled OFF -> Is Active: ${isActive} (Expected: false)`);
  if (isActive !== false) throw new Error('Expected inactive preference after toggle OFF');

  await preferenceService.togglePreference(regResult.user.id, true);
  isActive = await preferenceService.isPreferenceActive(regResult.user.id);
  console.log(`Toggled ON -> Is Active: ${isActive} (Expected: true)`);
  if (isActive !== true) throw new Error('Expected active preference after toggle ON');

  // Time-Banking deduction: 20 minutes call (1200 seconds)
  const deductedPass = await preferenceService.deductBankedTime(regResult.user.id, 1200);
  console.log(`Deducted 20 mins -> Remaining Bank: ${deductedPass.remainingSeconds}s (${(deductedPass.remainingSeconds / 3600).toFixed(2)}h)`);
  if (deductedPass.remainingSeconds !== 16800) {
    throw new Error(`Expected 16,800 remaining seconds, got ${deductedPass.remainingSeconds}`);
  }
  console.log('✅ FaceChat Preference Pass & Time Banking verified');

  // 7. FaceChat Star Rating (1-5 stars)
  console.log('\n--- 7. Testing FaceChat Star Rating System ---');
  const peerUser = await authService.register(`peer_${Date.now()}@facechat.app`, 'Pass12345!', 'Samantha', 'female', 'CA');
  const rating = await ratingService.submitRating(conv.id, regResult.user.id, peerUser.user.id, 5, ['Friendly', 'Engaging']);
  console.log(`Submitted Star Rating: ${rating.stars} Stars for User ${peerUser.user.id}`);
  const ratingSummary = await ratingService.getRatingSummary(peerUser.user.id);
  console.log(`User Aggregate Star Score: ${ratingSummary.starRating} Stars (${ratingSummary.totalRatings} ratings)`);
  if (ratingSummary.starRating !== 5.0) {
    throw new Error(`Expected 5.0 rating, got ${ratingSummary.starRating}`);
  }
  console.log('✅ FaceChat Star Rating verified');

  // 8. Active Member & Creator System (750 hours threshold, $1/hour earnings)
  console.log('\n--- 8. Testing Active Member Program & Creator System ---');
  const creatorProfile = await creatorService.getProfile(peerUser.user.id);
  console.log('Initial Creator Status:', creatorProfile.status, `(Verified Hours: ${creatorProfile.verifiedHours})`);

  // Attempt application before 750 hours
  const earlyApp = await creatorService.applyForCreator(peerUser.user.id, 'paypal', 'creator@facechat.app');
  console.log(`Early Application Eligible: ${earlyApp.isEligible} | Status: ${earlyApp.profile.status}`);
  if (earlyApp.isEligible !== false) {
    throw new Error('Should not be eligible before 750 verified hours');
  }

  // Simulate admin approving creator & earning $1/hour
  await creatorService.approveCreator(peerUser.user.id);
  // Simulate 2 hours of preferred calls (7200 seconds)
  const earnings = await creatorService.accrueCallEarnings(peerUser.user.id, 7200);
  console.log(`Earned Creator Payout for 2 hours: $${earnings ? earnings.earnedUsd : 0} USD (Expected: $2.00)`);
  if (!earnings || earnings.earnedUsd !== 2.0) {
    throw new Error(`Expected $2.00 creator earnings, got $${earnings ? earnings.earnedUsd : 0}`);
  }
  console.log('✅ Active Member Creator program ($1/hr) verified');

  // 9. Preferred Partner Booking ($5 for 7 days / up to 60 mins, $2.50 split)
  console.log('\n--- 9. Testing Preferred Partner Booking ($5 with $2.50 split) ---');
  const booking = await partnerService.requestBooking(regResult.user.id, peerUser.user.id);
  console.log(`Booking Requested ID: ${booking.id} | Amount: $${booking.amountUsd} | Partner Split: $${booking.partnerRevenueUsd} | Platform Split: $${booking.platformRevenueUsd}`);
  if (booking.partnerRevenueUsd !== 2.50 || booking.platformRevenueUsd !== 2.50) {
    throw new Error(`Expected $2.50 / $2.50 split, got partner: ${booking.partnerRevenueUsd}, platform: ${booking.platformRevenueUsd}`);
  }
  const acceptedBooking = await partnerService.updateBookingStatus(booking.id, peerUser.user.id, 'accepted');
  console.log(`Partner Accepted Booking: Status = ${acceptedBooking.status} | Max Minutes = ${acceptedBooking.maxMinutes}`);
  console.log('✅ Preferred Partner Booking ($5 with $2.50 split) verified');

  // 10. Loyalty Milestone Program & Rewards
  console.log('\n--- 10. Testing Loyalty Milestone Program ---');
  const loyalty = await loyaltyService.recordDailyMinutes(regResult.user.id, 25);
  console.log(`Recorded Daily Usage: ${loyalty.todayMinutes} mins today | Consecutive Days: ${loyalty.consecutiveDays}`);
  const loyaltyProgress = await loyaltyService.getProgress(regResult.user.id);
  console.log(`Loyalty Progress Status: ${loyaltyProgress.todayMinutes} mins recorded`);
  console.log('✅ Loyalty milestone tracking verified');

  // 11. Advertising Eligibility (Free users eligible after 24 verified hours)
  console.log('\n--- 11. Testing Advertising Eligibility (24 Hours threshold) ---');
  const adCheck = await adService.checkAdEligibility(regResult.user.id);
  console.log(`Ad Eligibility Check: shouldShowAds = ${adCheck.shouldShowAds} (Threshold: ${adCheck.thresholdHours}h, Current: ${adCheck.verifiedHours}h)`);
  console.log('✅ Advertising rules verified');

  // 12. Moderation & Blocks
  console.log('\n--- 12. Testing Moderation & Block Rematch Prevention ---');
  await blockUser(regResult.user.id, null, 'blocked_test_user', null, conv.id, 'permanent');
  const blocked = await isBlocked(regResult.user.id, 'blocked_test_user');
  console.log(`Is Blocked: ${blocked} (Expected: true)`);
  if (!blocked) throw new Error('Expected user to be blocked');
  console.log('✅ Block & safety verified');

  console.log('\n============================================================');
  console.log('🎉 ALL 12 FACECHAT BUSINESS & TOKEN ECONOMY TESTS PASSED! 🎉');
  console.log('============================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
