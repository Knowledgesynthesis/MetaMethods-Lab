# Generates reference results from R packages for the TypeScript engine tests.
#   Rscript scripts/r/make-fixtures.R
# Output: src/lib/stats/__tests__/fixtures/*.json
# Packages: metafor, meta, netmeta, mada, bayesmeta, jsonlite
CTRL <- list(maxiter = 2000, threshold = 1e-13, tol = 1e-13, stepadj = 0.5)
suppressPackageStartupMessages({
  library(metafor); library(meta); library(netmeta); library(mada); library(bayesmeta); library(jsonlite)
})
out_dir <- "src/lib/stats/__tests__/fixtures"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)
save <- function(x, name) writeLines(toJSON(x, auto_unbox = TRUE, digits = NA, null = "null", na = "null"),
                                     file.path(out_dir, paste0(name, ".json")))
versions <- sapply(c("metafor", "meta", "netmeta", "mada", "bayesmeta"), function(p) as.character(packageVersion(p)))
save(list(R = R.version.string, packages = as.list(versions)), "versions")

# ---------------------------------------------------------------- distributions
ps <- c(1e-10, 1e-4, 0.001, 0.025, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.975, 0.999, 1 - 1e-6)
xs <- c(-8, -3.5, -1.96, -1, -0.3, 0, 0.5, 1.2, 2.5, 4, 7)
dfs <- c(1, 2, 3, 5, 10, 30, 120)
save(list(
  pnorm = lapply(xs, function(x) list(x = x, p = pnorm(x))),
  qnorm = lapply(ps, function(p) list(p = p, q = qnorm(p))),
  pt = unlist(lapply(dfs, function(d) lapply(xs, function(x) list(x = x, df = d, p = pt(x, d)))), recursive = FALSE),
  qt = unlist(lapply(dfs, function(d) lapply(ps[ps > 1e-6 & ps < 0.9999], function(p) list(p = p, df = d, q = qt(p, d)))), recursive = FALSE),
  pchisq = unlist(lapply(dfs, function(d) lapply(c(0.01, 0.5, 1, 3, 8, 20, 60), function(x) list(x = x, df = d, p = pchisq(x, d)))), recursive = FALSE),
  qchisq = unlist(lapply(dfs, function(d) lapply(c(0.025, 0.5, 0.95, 0.975), function(p) list(p = p, df = d, q = qchisq(p, d)))), recursive = FALSE),
  pf = unlist(lapply(c(1, 2, 5), function(d1) lapply(c(3, 10, 40), function(d2) list(x = 2.1, df1 = d1, df2 = d2, p = pf(2.1, d1, d2)))), recursive = FALSE),
  qbeta = lapply(list(c(0.025, 1, 20), c(0.975, 5, 3), c(0.5, 0.5, 0.5), c(0.025, 3, 98)), function(v) list(p = v[1], a = v[2], b = v[3], q = qbeta(v[1], v[2], v[3])))
), "distributions")

# ---------------------------------------------------------------- pairwise
set.seed(20261120)
bcg <- escalc(measure = "RR", ai = tpos, bi = tneg, ci = cpos, di = cneg, data = dat.bcg)
pw_sets <- list(list(name = "BCG", yi = as.numeric(bcg$yi), vi = as.numeric(bcg$vi)))
for (i in 1:40) {
  k <- sample(c(2, 3, 4, 5, 6, 8, 10, 15, 25), 1)
  vi <- runif(k, 0.005, 0.3)
  tau <- sample(c(0, 0, 0.1, 0.3, 0.6), 1)
  yi <- rnorm(k, 0.2, sqrt(vi + tau^2))
  pw_sets[[length(pw_sets) + 1]] <- list(name = paste0("sim", i), yi = yi, vi = vi)
}
pw_out <- lapply(pw_sets, function(d) {
  res <- list(name = d$name, yi = d$yi, vi = d$vi)
  fe <- rma(d$yi, d$vi, method = "EE")
  res$common <- list(est = fe$beta[1], se = fe$se, Q = fe$QE, Qp = fe$QEp)
  for (m in c("REML", "DL", "PM", "ML")) {
    for (tst in c("z", "knha")) {
      if (tst == "knha" && length(d$yi) < 2) next
      f <- try(rma(d$yi, d$vi, method = m, test = tst, control = CTRL), silent = TRUE)
      if (inherits(f, "try-error")) next
      pr <- predict(f)
      ci <- if (length(d$yi) > 2) try(confint(f, control = list(tol = 1e-13)), silent = TRUE) else NULL
      entry <- list(est = f$beta[1], se = f$se, ci = c(f$ci.lb, f$ci.ub), pval = f$pval,
                    tau2 = f$tau2, I2 = f$I2, H2 = f$H2, pi = c(pr$pi.lb, pr$pi.ub))
      if (!is.null(ci) && !inherits(ci, "try-error")) entry$tau2CI <- as.numeric(ci$random["tau^2", 2:3])
      res[[paste0(m, "_", tst)]] <- entry
    }
  }
  res
})
save(pw_out, "pairwise")

# ---------------------------------------------------------------- escalc parity
set.seed(7)
tabs <- lapply(1:40, function(i) {
  n1 <- sample(5:300, 1); n2 <- sample(5:300, 1)
  p <- sample(c(0, 0.01, 0.05, 0.2, 0.5, 0.9, 1), 2, replace = TRUE)
  list(ai = rbinom(1, n1, p[1]), n1 = n1, ci = rbinom(1, n2, p[2]), n2 = n2)
})
tabs <- Filter(function(t) !((t$ai == 0 && t$ci == 0) || (t$ai == t$n1 && t$ci == t$n2)), tabs)
esc <- lapply(tabs, function(t) {
  r <- t
  for (m in c("RR", "OR", "RD")) {
    e <- escalc(m, ai = t$ai, n1i = t$n1, ci = t$ci, n2i = t$n2)
    r[[m]] <- list(yi = as.numeric(e$yi), vi = as.numeric(e$vi))
  }
  r
})
cont <- lapply(1:15, function(i) {
  n1 <- sample(4:200, 1); n2 <- sample(4:200, 1)
  m1 <- runif(1, 5, 50); m2 <- runif(1, 5, 50); s1 <- runif(1, 1, 15); s2 <- runif(1, 1, 15)
  smd <- escalc("SMD", m1i = m1, sd1i = s1, n1i = n1, m2i = m2, sd2i = s2, n2i = n2)
  md <- escalc("MD", m1i = m1, sd1i = s1, n1i = n1, m2i = m2, sd2i = s2, n2i = n2)
  rom <- escalc("ROM", m1i = m1, sd1i = s1, n1i = n1, m2i = m2, sd2i = s2, n2i = n2)
  list(m1 = m1, s1 = s1, n1 = n1, m2 = m2, s2 = s2, n2 = n2,
       SMD = list(yi = as.numeric(smd$yi), vi = as.numeric(smd$vi)),
       MD = list(yi = as.numeric(md$yi), vi = as.numeric(md$vi)),
       ROM = list(yi = as.numeric(rom$yi), vi = as.numeric(rom$vi)))
})
props <- lapply(1:20, function(i) {
  n <- sample(5:400, 1); x <- sample(c(0, n, rbinom(1, n, runif(1, 0, 0.6))), 1, prob = c(0.15, 0.05, 0.8))
  r <- list(x = x, n = n)
  for (m in c("PR", "PLO", "PAS", "PFT")) { e <- escalc(m, xi = x, ni = n); r[[m]] <- list(yi = as.numeric(e$yi), vi = as.numeric(e$vi)) }
  r
})
save(list(binary = esc, continuous = cont, proportions = props), "escalc")

# ---------------------------------------------------------------- MH and Peto
set.seed(11)
mh <- lapply(1:15, function(i) {
  k <- sample(4:10, 1)
  n1 <- sample(20:400, k, TRUE); n2 <- sample(20:400, k, TRUE)
  p0 <- runif(1, 0.005, 0.15)
  ai <- rbinom(k, n1, p0 * 0.7); ci <- rbinom(k, n2, p0)
  r <- list(ai = ai, n1 = n1, ci = ci, n2 = n2)
  for (m in c("OR", "RR", "RD")) {
    f <- try(rma.mh(ai = ai, n1i = n1, ci = ci, n2i = n2, measure = m), silent = TRUE)
    if (!inherits(f, "try-error")) r[[m]] <- list(est = f$beta[1], se = f$se, Q = f$QE)
  }
  f <- try(rma.peto(ai = ai, n1i = n1, ci = ci, n2i = n2), silent = TRUE)
  if (!inherits(f, "try-error")) r$PETO <- list(est = f$beta[1], se = f$se, Q = f$QE)
  r
})
save(mh, "mh")

# ---------------------------------------------------------------- proportions pooling
set.seed(3)
pp <- lapply(1:12, function(i) {
  k <- sample(5:15, 1)
  n <- sample(10:500, k, TRUE)
  mu <- qlogis(runif(1, 0.02, 0.4)); tau <- sample(c(0, 0.3, 0.8), 1)
  x <- rbinom(k, n, plogis(rnorm(k, mu, tau)))
  r <- list(x = x, n = n)
  f <- rma(measure = "PFT", xi = x, ni = n, method = "REML", control = CTRL)
  pr <- predict(f, transf = transf.ipft.hm, targs = list(ni = n))
  r$PFT <- list(est = f$beta[1], se = f$se, tau2 = f$tau2, back = pr$pred, back_ci = c(pr$ci.lb, pr$ci.ub))
  f2 <- rma(measure = "PLO", xi = x, ni = n, method = "REML", control = CTRL)
  r$PLO <- list(est = f2$beta[1], se = f2$se, tau2 = f2$tau2)
  g <- try(rma.glmm(measure = "PLO", xi = x, ni = n), silent = TRUE)
  if (!inherits(g, "try-error")) r$GLMM <- list(est = g$beta[1], se = g$se, tau2 = g$tau2)
  r
})
save(pp, "proportions")

# ---------------------------------------------------------------- meta-regression
reg <- list()
for (m in c("REML", "DL")) for (tst in c("z", "knha")) {
  f <- rma(yi, vi, mods = ~ ablat, data = bcg, method = m, test = tst, control = CTRL)
  reg[[length(reg) + 1]] <- list(name = "BCG-ablat", method = m, test = tst, yi = as.numeric(bcg$yi), vi = as.numeric(bcg$vi),
                                 X = cbind(1, dat.bcg$ablat), beta = as.numeric(f$beta), se = f$se, tau2 = f$tau2,
                                 QE = f$QE, QM = f$QM, QMp = f$QMp, R2 = ifelse(is.null(f$R2), NA, f$R2), I2 = f$I2,
                                 pval = f$pval)
}
set.seed(5)
for (i in 1:8) {
  k <- sample(10:30, 1)
  x1 <- runif(k, 0, 10); x2 <- rbinom(k, 1, 0.5); vi <- runif(k, 0.01, 0.2)
  yi <- 0.1 + 0.05 * x1 - 0.2 * x2 + rnorm(k, 0, sqrt(vi + 0.05))
  for (m in c("REML", "DL")) for (tst in c("z", "knha")) {
    f <- rma(yi, vi, mods = ~ x1 + x2, method = m, test = tst, control = CTRL)
    reg[[length(reg) + 1]] <- list(name = paste0("sim", i), method = m, test = tst, yi = yi, vi = vi, X = cbind(1, x1, x2),
                                   beta = as.numeric(f$beta), se = f$se, tau2 = f$tau2, QE = f$QE, QM = f$QM, QMp = f$QMp,
                                   R2 = ifelse(is.null(f$R2), NA, f$R2), I2 = f$I2, pval = f$pval)
  }
}
save(reg, "metareg")

# subgroups (meta, separate tau2, Wald)
sg <- with(bcg, metagen(yi, sqrt(vi), subgroup = dat.bcg$alloc, method.tau = "REML", common = FALSE, random = TRUE))
save(list(yi = as.numeric(bcg$yi), vi = as.numeric(bcg$vi), groups = as.character(dat.bcg$alloc),
          Q = sg$Q.b.random, p = sg$pval.Q.b.random, est = as.numeric(sg$TE.random.w), labels = names(sg$TE.random.w)), "subgroup")

# ---------------------------------------------------------------- small-study effects
set.seed(9)
pb <- lapply(1:15, function(i) {
  k <- sample(10:30, 1)
  vi <- runif(k, 0.005, 0.4)
  yi <- rnorm(k, 0.3 + 0.8 * sqrt(vi) * sample(c(0, 1, 2), 1), sqrt(vi + 0.02))
  r <- list(yi = yi, vi = vi)
  for (m in c("REML", "DL", "EE")) {
    f <- try(rma(yi, vi, method = m, control = CTRL), silent = TRUE)
    if (inherits(f, "try-error")) next
    eg <- regtest(f, model = "lm", predictor = "sei")
    tf <- try(trimfill(f), silent = TRUE)
    if (inherits(tf, "try-error")) next
    r[[m]] <- list(egger_t = eg$zval, egger_p = eg$pval, egger_limit = as.numeric(eg$est),
                   tf_k0 = tf$k0, tf_side = tf$side, tf_est = tf$beta[1], tf_se = tf$se)
  }
  rk <- ranktest(rma(yi, vi, method = "EE"))
  r$begg_tau <- as.numeric(rk$tau)
  r
})
save(pb, "pubbias")
set.seed(10)
peters <- lapply(1:6, function(i) {
  k <- sample(10:20, 1); n1 <- sample(30:500, k, TRUE); n2 <- sample(30:500, k, TRUE)
  ai <- rbinom(k, n1, 0.15); ci <- rbinom(k, n2, 0.2)
  m <- metabin(ai, n1, ci, n2, sm = "OR", method = "Inverse")
  b <- metabias(m, method.bias = "Peters", k.min = 3)
  list(ai = ai, n1 = n1, ci = ci, n2 = n2, t = as.numeric(b$statistic), p = as.numeric(b$p.value),
       bias = as.numeric(b$estimate[1]))
})
save(peters, "peters")

# ---------------------------------------------------------------- DTA bivariate (mada)
data(AuditC, package = "mada")
set.seed(12)
dta_sets <- list(list(name = "AuditC", TP = AuditC$TP, FN = AuditC$FN, FP = AuditC$FP, TN = AuditC$TN))
for (i in 1:6) {
  k <- sample(6:20, 1)
  m <- c(qlogis(0.85), qlogis(0.12)); S <- matrix(c(0.4, -0.15, -0.15, 0.5), 2)
  th <- MASS::mvrnorm(k, m, S)
  nd <- sample(20:200, k, TRUE); nn <- sample(50:400, k, TRUE)
  TP <- rbinom(k, nd, plogis(th[, 1])); FP <- rbinom(k, nn, plogis(th[, 2]))
  dta_sets[[length(dta_sets) + 1]] <- list(name = paste0("sim", i), TP = TP, FN = nd - TP, FP = FP, TN = nn - FP)
}
dta <- lapply(dta_sets, function(d) {
  f <- reitsma(data.frame(TP = d$TP, FN = d$FN, FP = d$FP, TN = d$TN))
  s <- summary(f)
  d$coef <- as.numeric(f$coefficients); d$vcov <- unname(f$vcov); d$Psi <- unname(f$Psi)
  d$auc <- as.numeric(AUC(f)$AUC)
  d$logLik <- as.numeric(f$logLik)
  d
})
save(dta, "dta")

# ---------------------------------------------------------------- NMA (netmeta)
set.seed(21)
trts <- c("A", "B", "C", "D", "E")
truth <- c(A = 0, B = -0.3, C = -0.5, D = -0.2, E = -0.6)
nma_sets <- lapply(1:5, function(i) {
  comps <- list(c("A", "B"), c("A", "C"), c("B", "C"), c("A", "D"), c("C", "E"), c("D", "E"), c("B", "E"))
  comps <- comps[sort(sample(seq_along(comps), sample(5:7, 1)))]
  rows <- do.call(rbind, lapply(comps, function(cp) {
    ns <- sample(1:5, 1)
    vi <- runif(ns, 0.02, 0.2)
    yi <- rnorm(ns, truth[cp[2]] - truth[cp[1]] + ifelse(i == 5 && cp[1] == "B", 0.6, 0), sqrt(vi + 0.03))
    data.frame(t1 = cp[1], t2 = cp[2], yi = yi, vi = vi)
  }))
  rows$id <- paste0("s", seq_len(nrow(rows)))
  if (length(unique(c(rows$t1, rows$t2))) < 3) return(NULL)
  f <- try(netmeta(TE = rows$yi, seTE = sqrt(rows$vi), treat1 = rows$t2, treat2 = rows$t1, studlab = rows$id,
                   common = TRUE, random = TRUE, reference.group = "A", sm = "MD"), silent = TRUE)
  if (inherits(f, "try-error")) return(NULL)
  ns <- netsplit(f)
  rk <- netrank(f, small.values = "desirable")
  tr <- rownames(f$TE.random)
  list(studies = rows, treatments = tr,
       tau2 = f$tau2, Q = f$Q, df = f$df.Q, Qhet = f$Q.heterogeneity, Qinc = f$Q.inconsistency,
       TE_common = unname(f$TE.common), seTE_common = unname(f$seTE.common),
       TE_random = unname(f$TE.random), seTE_random = unname(f$seTE.random),
       pscore_random = unname(rk$ranking.random[tr]), pscore_common = unname(rk$ranking.common[tr]),
       split = data.frame(comparison = ns$comparison, direct = ns$direct.random$TE, indirect = ns$indirect.random$TE,
                          p = ns$compare.random$p))
})
save(Filter(Negate(is.null), nma_sets), "nma")

# ---------------------------------------------------------------- Bayesian (bayesmeta)
set.seed(4)
bm <- list()
for (i in 1:5) {
  k <- sample(3:12, 1); vi <- runif(k, 0.02, 0.3); yi <- rnorm(k, -0.3, sqrt(vi + 0.05))
  for (sc in c(0.5, 1)) {
    f <- bayesmeta(y = yi, sigma = sqrt(vi), mu.prior.mean = 0, mu.prior.sd = 4,
                   tau.prior = function(t) dhalfnormal(t, scale = sc))
    s <- f$summary
    mci <- f$qposterior(mu.p = c(0.025, 0.975))
    tci <- f$qposterior(theta.p = c(0.025, 0.975), predict = TRUE)
    bm[[length(bm) + 1]] <- list(yi = yi, vi = vi, scale = sc, prior = "halfnormal",
                                 mu_median = s["median", "mu"], mu_lo = mci[1], mu_hi = mci[2],
                                 tau_median = s["median", "tau"], theta_lo = tci[1], theta_hi = tci[2],
                                 mu_mean = s["mean", "mu"])
  }
}
save(bm, "bayes")
cat("Fixtures written to", out_dir, "\n")
