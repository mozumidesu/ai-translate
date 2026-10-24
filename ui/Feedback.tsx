/*
 * AI Translate — the links at the top of the plugin's page and the window
 * behind the envelope.
 *
 * Vencord draws the title bar itself and leaves no room in it, so the row is
 * rendered as the about section and lifted to sit beside the authors.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, Tooltip, useEffect, useState, UserStore } from "@webpack/common";

import { Bridge } from "../bridge";
import { currentLocale, isRightToLeft, t } from "../locales";

const cl = classNameFactory("vc-aitrans-");

export const SUPPORT_SERVER = "https://discord.gg/HKRc9FfK43";
export const PROJECT_PAGE = "https://github.com/mozumidesu/ai-translate";

/** A relay, not the Discord webhook: anything shipped here is readable. */
const FEEDBACK_ENDPOINT = "https://ai-translate-feedback.mozumidesu.workers.dev";

const SUBJECT_LIMIT = 256;
/** The counter only appears once the room left is worth watching. */
const COUNTER_FROM = 50;
const MESSAGE_LIMIT = 3800;

// --- icons ---

const GitHubIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
);

const MAIL_PATH = "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.2-8 5-8-5V6l8 5 8-5v2.2Z";

const MailIcon = ({ size = 20 }: { size?: number; }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={MAIL_PATH} />
    </svg>
);

// --- screenshots ---

interface Shot {
    name: string;
    type: string;
    /** base64, without the data: prefix — the relay turns it back into a file. */
    data: string;
}

const MAX_IMAGES = 3;

/** The largest single image the window will take. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Everything attached travels as one Discord message, and Discord caps what
 * one message may carry. This stays under that with room to spare.
 */
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;

const MAX_EDGE_PX = 1920;

const MB = (bytes: number) => Math.round(bytes / (1024 * 1024));

const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
});

/** The file exactly as it was picked, nothing touched. */
async function readImage(file: File): Promise<Shot | null> {
    try {
        return { name: file.name || "screenshot", type: file.type, data: await toBase64(file) };
    } catch {
        return null;
    }
}

/**
 * A screenshot off a 4K display is several megabytes of PNG. Scaled to 1920
 * across and re-encoded it is a fraction of that and still perfectly readable,
 * which is what makes several of them fit into one message.
 */
async function shrinkImage(file: File): Promise<Shot | null> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();

        const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, "image/jpeg", 0.85));
        if (!blob) return null;

        return { name: (file.name || "screenshot").replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data: await toBase64(blob) };
    } catch {
        return null;
    }
}

/** base64 carries three bytes in every four characters. */
const shotBytes = (shot: Shot) => (shot.data.length * 3) / 4;

const totalBytes = (shots: Shot[]) => shots.reduce((sum, shot) => sum + shotBytes(shot), 0);

// --- validation ---

/**
 * Deliberately loose: one @, no spaces, and a dot somewhere in the domain.
 * Anything stricter starts refusing perfectly real addresses.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const emailLooksWrong = (value: string) => value.trim() !== "" && !EMAIL.test(value.trim());

// --- the window ---

function FeedbackModal({ rootProps }: { rootProps: RenderModalProps; }) {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [replyTo, setReplyTo] = useState("");
    const [shots, setShots] = useState<Shot[]>([]);
    const [imageError, setImageError] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

    // What the relay answered, so a failure can say which of the two it was:
    // never reached (-1), or reached and refused. "Check your connection"
    // alone sent us looking in the wrong place once already.
    const [answered, setAnswered] = useState(0);

    const [zone, setZone] = useState<HTMLDivElement | null>(null);
    const [picker, setPicker] = useState<HTMLInputElement | null>(null);

    const addImages = async (files: File[]) => {
        setImageError("");

        const taken: Shot[] = [];
        let complaint = "";

        let room = MAX_TOTAL_BYTES - totalBytes(shots);
        let slots = MAX_IMAGES - shots.length;

        for (const file of files) {
            if (slots <= 0) break;

            if (!file.type.startsWith("image/")) {
                complaint = t("feedback.imageBad");
                continue;
            }

            if (file.size > MAX_IMAGE_BYTES) {
                complaint = t("feedback.imageTooBig", { size: MB(MAX_IMAGE_BYTES), total: MB(MAX_TOTAL_BYTES) });
                continue;
            }

            // Full quality while there is room for it, so a single screenshot
            // arrives exactly as it was taken; scaled down only when the batch
            // would otherwise not fit.
            let shot = file.size <= room ? await readImage(file) : await shrinkImage(file);
            if (shot && shotBytes(shot) > room) shot = await shrinkImage(file);

            if (!shot || shotBytes(shot) > room) {
                complaint = t("feedback.imageTooBig", { size: MB(MAX_IMAGE_BYTES), total: MB(MAX_TOTAL_BYTES) });
                continue;
            }

            taken.push(shot);
            room -= shotBytes(shot);
            slots--;
        }

        if (taken.length) setShots(prev => [...prev, ...taken]);
        if (complaint) setImageError(complaint);
    };

    // Pasting is how a screenshot usually arrives, so it is caught anywhere in
    // this window rather than only over the box.
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const root = zone?.closest('[role="dialog"]') ?? zone;
            if (!root || (e.target instanceof Node && !root.contains(e.target))) return;

            const files = [...(e.clipboardData?.files ?? [])].filter(f => f.type.startsWith("image/"));
            if (!files.length) return;

            // Discord uploads a pasted image into the open chat wherever the
            // paste happens. Taking the event here, on the way down, keeps the
            // screenshot in this window and out of the conversation.
            e.preventDefault();
            e.stopImmediatePropagation();
            void addImages(files);
        };

        document.addEventListener("paste", onPaste, true);
        window.addEventListener("paste", onPaste, true);

        return () => {
            document.removeEventListener("paste", onPaste, true);
            window.removeEventListener("paste", onPaste, true);
        };
    }, [zone, shots]);

    const emailWrong = emailTouched && emailLooksWrong(replyTo);
    const left = SUBJECT_LIMIT - subject.length;

    const send = async () => {
        // The address is only judged once, when the field is left; clicking
        // Send counts as leaving it.
        if (emailLooksWrong(replyTo)) return setEmailTouched(true);

        setState("sending");

        const author = UserStore.getCurrentUser();

        // Plain fields: the relay decides how they are presented, so the look
        // can be changed without shipping a new build of the plugin.
        const { status } = await Bridge.sendAiTranslateFeedback(JSON.stringify({
            endpoint: FEEDBACK_ENDPOINT,
            body: {
                subject: subject.slice(0, SUBJECT_LIMIT),
                message: message.slice(0, MESSAGE_LIMIT),
                replyTo: replyTo.trim().slice(0, 200),
                discord: author ? `${author.username} (${author.id})` : "",
                locale: currentLocale(),
                images: shots
            }
        }));

        setAnswered(status);
        setState(status >= 200 && status < 300 ? "sent" : "failed");
    };

    const blocked = state === "sending" || state === "sent" || !subject.trim() || !message.trim();

    return (
        <Modal {...rootProps} title={t("feedback.title")}>
            <div dir={isRightToLeft() ? "rtl" : undefined}>
            <div className={cl("feedback-head")}>
                <div className={cl("feedback-badge")}>
                    <MailIcon size={30} />
                </div>
                <Forms.FormText>{t("feedback.intro")}</Forms.FormText>
            </div>

            <div className={cl("field")}>
                <div className={cl("field-head")}>
                    <Forms.FormTitle tag="h3" className={cl("field-label")}>
                        {t("feedback.subject")}
                    </Forms.FormTitle>
                    {left <= COUNTER_FROM && (
                        <span className={cl("counter", left <= 0 ? "counter-out" : "")}>
                            {t("feedback.charsLeft", { left })}
                        </span>
                    )}
                </div>
                <input
                    className={cl("input")}
                    type="text"
                    value={subject}
                    maxLength={SUBJECT_LIMIT}
                    placeholder={t("feedback.subjectHint")}
                    onChange={e => setSubject(e.currentTarget.value)}
                />
            </div>

            <div className={cl("field")}>
                <Forms.FormTitle tag="h3" className={cl("field-label")}>
                    {t("feedback.message")}
                </Forms.FormTitle>
                <textarea
                    className={cl("input", "textarea")}
                    value={message}
                    maxLength={MESSAGE_LIMIT}
                    placeholder={t("feedback.messageHint")}
                    onChange={e => setMessage(e.currentTarget.value)}
                />
            </div>

            <div className={cl("field")}>
                <Forms.FormTitle tag="h3" className={cl("field-label")}>
                    {t("feedback.screenshot")} <span className={cl("optional")}>{t("feedback.optional")}</span>
                </Forms.FormTitle>

                <div
                    ref={setZone}
                    className={cl("drop", dragging ? "drop-over" : "")}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setDragging(false);
                        void addImages([...e.dataTransfer.files]);
                    }}
                >
                    {shots.length > 0 && (
                        <div className={cl("shots")}>
                            {shots.map((shot, i) => (
                                <div key={i} className={cl("shot")}>
                                    <img src={`data:${shot.type};base64,${shot.data}`} alt={shot.name} />
                                    <button
                                        type="button"
                                        className={cl("shot-remove")}
                                        aria-label={t("feedback.removeImage")}
                                        onClick={() => setShots(prev => prev.filter((_, n) => n !== i))}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={cl("drop-text")}>
                        {t("feedback.screenshotHint", { count: MAX_IMAGES })}
                    </div>

                    <Button
                        size="small"
                        variant="secondary"
                        disabled={shots.length >= MAX_IMAGES}
                        onClick={() => picker?.click()}
                    >
                        {t("feedback.addImage")}
                    </Button>

                    <input
                        ref={setPicker}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={e => {
                            void addImages([...(e.currentTarget.files ?? [])]);
                            e.currentTarget.value = "";
                        }}
                    />
                </div>

                {imageError && <Forms.FormText className={cl("warning")}>{imageError}</Forms.FormText>}
            </div>

            <div className={cl("field")}>
                <Forms.FormTitle tag="h3" className={cl("field-label")}>
                    {t("feedback.email")} <span className={cl("optional")}>{t("feedback.optional")}</span>
                </Forms.FormTitle>
                <input
                    className={cl("input", emailWrong ? "input-wrong" : "")}
                    type="email"
                    value={replyTo}
                    maxLength={200}
                    placeholder={t("feedback.emailHint")}
                    onChange={e => setReplyTo(e.currentTarget.value)}
                    // Checked when the field is left, not while it is being typed in.
                    onBlur={() => setEmailTouched(true)}
                    onFocus={() => setEmailTouched(false)}
                />
                {emailWrong && <Forms.FormText className={cl("warning")}>{t("feedback.emailInvalid")}</Forms.FormText>}

                {/* Kept under the field it explains rather than adrift below it. */}
                <Forms.FormText className={cl("hint")}>{t("feedback.attached")}</Forms.FormText>
            </div>

            <Button className={cl("wide")} disabled={blocked} onClick={send}>
                {state === "sending" ? t("feedback.sending") : t("feedback.send")}
            </Button>

            {(state === "sent" || state === "failed") && (
                <Forms.FormText className={Margins.top8}>
                    {state === "sent"
                        ? t("feedback.sentHint")
                        : answered > 0
                            ? t("feedback.failedCode", { status: answered })
                            : t("feedback.failed")}
                </Forms.FormText>
            )}

            <Forms.FormText className={cl("feedback-or")}>
                {t("feedback.or")}
            </Forms.FormText>

            <div className={cl("centre")}>
                <Button
                    className={cl("altbutton")}
                    variant="secondary"
                    onClick={() => VencordNative.native.openExternal(SUPPORT_SERVER)}
                >
                    {t("feedback.discord")}
                </Button>
            </div>
            </div>
        </Modal>
    );
}

export function openFeedbackModal() {
    openModal(props => <FeedbackModal rootProps={props} />);
}

// --- the row of links ---

function LinkButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode; }) {
    return (
        <Tooltip text={label}>
            {tooltipProps => (
                <button {...tooltipProps} className={cl("link-button")} aria-label={label} onClick={onClick}>
                    {children}
                </button>
            )}
        </Tooltip>
    );
}

/* Vencord draws the authors just above; this is what brings the row level
   with their avatars. */
const LIFT_PX = 45;

export function SettingsHeader() {
    return (
        <div className={cl("header-links")} style={{ marginTop: -LIFT_PX }}>
            <LinkButton
                label={t("feedback.project")}
                onClick={() => VencordNative.native.openExternal(PROJECT_PAGE)}
            >
                <GitHubIcon />
            </LinkButton>

            <LinkButton label={t("feedback.support")} onClick={openFeedbackModal}>
                <MailIcon />
            </LinkButton>
        </div>
    );
}
