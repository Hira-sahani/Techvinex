
CREATE POLICY "Admins can view all contracts" ON public.contracts FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all employer billing" ON public.employer_billing FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all offers" ON public.offers FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all assessments" ON public.assessments FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all job applications" ON public.job_applications FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all employer jobs" ON public.employer_jobs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all employer candidates" ON public.employer_candidates FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all employer interviews" ON public.employer_interviews FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all payout accounts" ON public.payout_accounts FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all payout history" ON public.payout_history FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all ai jobs" ON public.ai_jobs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all referrals" ON public.referrals FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
